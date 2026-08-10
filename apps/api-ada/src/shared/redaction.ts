/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

const REDACTED = '[REDACTED]';
const MAX_REDACTION_DEPTH = 6;

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[_-]/g, '');
}

/**
 * As listas passam pelo mesmo normalizador da chave consultada.
 *
 * Escrever `'x-hub-signature-256'` cru na lista era falha silenciosa: a consulta chega como
 * `xhubsignature256` e nunca casava, entao justo a assinatura do webhook saia limpa no log.
 */
function buildKeySet(keys: readonly string[]): ReadonlySet<string> {
  return new Set(keys.map(normalizeKey));
}

// A redacao vive aqui, e nao na disciplina de quem escreve o log: defesa em profundidade.
const SENSITIVE_KEYS = buildKeySet([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-hub-signature-256',
  'password',
  'token',
  'access-token',
  'refresh-token',
  'secret',
  'api-key',
  'cpf',
  'cnpj',
  'email',
  'birthdate',
  'address',
  'fullname',
  'body',
  'text',
  'message',
  'transcript',
]);

const PHONE_KEYS = buildKeySet([
  'phone',
  'phone-number',
  'whatsapp',
  // Chave de sessao do modulo do SDK: aparece em praticamente todo log de conversa.
  'whatsapp-number',
  'msisdn',
  'wa-id',
  'from',
  'to',
]);

export function maskPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `****${digits.slice(-4)}`;
}

function redactValue(key: string, value: unknown, depth: number): unknown {
  const normalized = normalizeKey(key);

  if (PHONE_KEYS.has(normalized)) {
    return typeof value === 'string' ? maskPhoneNumber(value) : REDACTED;
  }

  if (SENSITIVE_KEYS.has(normalized)) {
    return REDACTED;
  }

  return redactUnknown(value, depth + 1);
}

function redactUnknown(value: unknown, depth: number): unknown {
  if (depth > MAX_REDACTION_DEPTH) return REDACTED;
  if (value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item) => redactUnknown(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    result[key] = redactValue(key, item, depth);
  }
  return result;
}

export function redactLogMeta(meta: Record<string, unknown>): Record<string, unknown> {
  return redactUnknown(meta, 0) as Record<string, unknown>;
}
