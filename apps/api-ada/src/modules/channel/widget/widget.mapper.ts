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
