/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { MessageRow } from '@adatechnology/meta-whatsapp-module';

export type WidgetMessage = {
  readonly id: string;
  readonly direction: string;
  readonly sender: string;
  readonly type: string;
  readonly content: string | null;
  readonly payload: unknown;
  readonly createdAt: string;
};

/**
 * Recorte do transcript para o navegador.
 *
 * Nao e cosmetico: `companyId`, `sessionId`, `whatsappNumber` e `agentUserId` sao dados internos, e
 * esta rota e publica. Listar campo a campo garante que coluna nova no modulo nao vaze sozinha.
 */
export function toWidgetMessage(row: MessageRow): WidgetMessage {
  return {
    id: row.id,
    direction: row.direction,
    sender: row.sender,
    type: row.type,
    content: row.content,
    payload: row.payload,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Carimba no ultimo balao do bot o que a pergunta espera de volta.
 *
 * Vai no `payload` da mensagem, e nao num campo novo da resposta, porque o widget ja le opcoes dali
 * — e o hint tem exatamente a mesma validade: vale enquanto aquela pergunta e a ultima da tela.
 */
export function withAnswerKind(
  messages: readonly WidgetMessage[],
  answerKind: string,
): readonly WidgetMessage[] {
  const last = messages.at(-1);
  if (!answerKind || !last) return messages;

  const payload = typeof last.payload === 'object' && last.payload !== null ? last.payload : {};

  return [...messages.slice(0, -1), { ...last, payload: { ...payload, answerKind } }];
}
