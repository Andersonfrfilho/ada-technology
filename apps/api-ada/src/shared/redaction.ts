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

// Nome que contenha um destes fragmentos e segredo, mesmo sem constar na lista exata (`railwayToken`, `newPassword`).
const SENSITIVE_KEY_FRAGMENTS: readonly string[] = [
  'token',
  'password',
  'secret',
  'ciphertext',
  'encryptionkey',
  'credential',
  'bearer',
  'authorization',
  'cookie',
  'jwt',
  'apikey',
  'privatekey',
  'signature',
  'passwd',
  'pwd',
];

// Segredo no VALOR de uma chave inocua (mensagem de erro, URL com credencial): cada padrao troca so o trecho secreto.
const SECRET_VALUE_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bBearer\s+\S+/gi, `Bearer ${REDACTED}`],
  [/(:\/\/)[^\s:@/]+:[^\s@/]+@/g, `$1${REDACTED}@`],
  [/\b(token|password|secret)=\S+/gi, `$1=${REDACTED}`],
  [/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, REDACTED],
];

export function scrubSecretValues(text: string): string {
  return SECRET_VALUE_PATTERNS.reduce((scrubbed, [pattern, replacement]) => scrubbed.replace(pattern, replacement), text);
}

// Excecoes ao fragmento: so o que comprovadamente nao e segredo, uma por linha com o motivo.
const NON_SECRET_KEYS = buildKeySet([
  // Ultimos 4 caracteres do token (coluna varchar(4)): serve so para a pessoa reconhecer qual token e.
  'token-hint',
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

function isSensitiveKey(normalized: string): boolean {
  if (SENSITIVE_KEYS.has(normalized)) return true;
  if (NON_SECRET_KEYS.has(normalized)) return false;
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

function redactValue(key: string, value: unknown, depth: number): unknown {
  const normalized = normalizeKey(key);

  if (PHONE_KEYS.has(normalized)) {
    return typeof value === 'string' ? maskPhoneNumber(value) : REDACTED;
  }

  if (isSensitiveKey(normalized)) {
    return REDACTED;
  }

  return redactUnknown(value, depth + 1);
}

function redactUnknown(value: unknown, depth: number): unknown {
  if (depth > MAX_REDACTION_DEPTH) return REDACTED;
  if (typeof value === 'string') return scrubSecretValues(value);
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

// Limite: o valor so e limpo nos padroes conhecidos (Bearer, user:senha@, token=, JWT); segredo sem forma reconhecivel passa.
export function redactLogMeta(meta: Record<string, unknown>): Record<string, unknown> {
  return redactUnknown(meta, 0) as Record<string, unknown>;
}
