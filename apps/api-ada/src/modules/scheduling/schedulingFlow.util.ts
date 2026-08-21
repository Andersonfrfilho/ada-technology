/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { WHATSAPP_CHOICE_LIMIT } from '@adatechnology/meta-whatsapp-contracts';

/**
 * Casa o que o cliente respondeu com o que foi oferecido.
 *
 * A lista de pessoas e a de horarios sao dinamicas, entao `validateFlowAnswer` nao tem `options`
 * para conferir e aceita qualquer texto. Sem esta checagem, um id digitado a esmo viraria tentativa
 * de reserva na agenda de outra pessoa — a escolha e do cliente, mas so entre o que foi mostrado.
 *
 * Aceita o proprio id ou a posicao na lista, como o no de escolha estatico faz: o WhatsApp deixa
 * digitar, e quem digita responde "2".
 */
export function resolveOfferedChoice(params: {
  readonly offered: readonly string[];
  readonly answer: unknown;
}): string | undefined {
  const { offered, answer } = params;
  if (typeof answer !== 'string') return undefined;

  const trimmed = answer.trim();
  if (offered.includes(trimmed)) return trimmed;

  const position = Number(trimmed);
  if (!Number.isInteger(position) || position < 1 || position > offered.length) return undefined;

  return offered[position - 1];
}

/** O contexto da sessao e `unknown` por contrato: so vira lista de ids depois de conferido. */
export function readOfferedOptions(params: {
  readonly context: Record<string, unknown>;
  readonly key: string;
}): readonly string[] {
  const value = params.context[params.key];
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === 'string');
}

/**
 * O rotulo do horario no fuso da agenda, nunca no do servidor.
 *
 * O corte em `LIST_ROW_TITLE_LENGTH` nao e estetica: titulo maior faz a Graph API recusar a
 * mensagem inteira, e o cliente ve silencio.
 */
export function formatSlotLabel(params: { readonly startsAt: Date; readonly timezone: string }): string {
  const label = new Intl.DateTimeFormat('pt-BR', {
    timeZone: params.timezone,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(params.startsAt);

  return label.slice(0, WHATSAPP_CHOICE_LIMIT.LIST_ROW_TITLE_LENGTH);
}
