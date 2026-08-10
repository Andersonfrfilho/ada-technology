/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { ConversationSession, SessionMode } from '@adatechnology/meta-whatsapp-contracts';
import type { SessionRow } from '@adatechnology/meta-whatsapp-module';

import { SESSION_MODE } from '@/shared/constants/domain.constant';

function toIsoString(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

/**
 * A coluna e `varchar` (o modulo nao usa ENUM nativo), entao o tipo que sai do banco e `string`.
 * Comparar contra a constante em vez de assertar mantem qualquer valor inesperado atendido pelo
 * bot, e nao numa sessao com modo invalido que ninguem consegue interpretar.
 */
function toSessionMode(value: string): SessionMode {
  return value === SESSION_MODE.HUMAN ? SESSION_MODE.HUMAN : SESSION_MODE.BOT;
}

/** A linha do banco carrega `Date`; o contrato do interpretador espera ISO string. */
export function toConversationSession(row: SessionRow): ConversationSession {
  return {
    id: row.id,
    companyId: row.companyId,
    whatsappNumber: row.whatsappNumber,
    currentState: row.currentState,
    flowKey: row.flowKey,
    currentNodeId: row.currentNodeId,
    context: row.context,
    mode: toSessionMode(row.mode),
    assignedUserId: row.assignedUserId,
    humanRequestedAt: toIsoString(row.humanRequestedAt),
    lastInboundAt: toIsoString(row.lastInboundAt),
    lastAgentReadAt: toIsoString(row.lastAgentReadAt),
    lastActivity: row.lastActivity.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
