/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { MessageRow } from '@adatechnology/meta-whatsapp-module';

import { ACTOR_TYPE, AUDIT_ACTION, AUDIT_TARGET } from '@/modules/audit/audit.constant';
import {
  PANEL_TRANSCRIPT_EXPORT_LIMIT,
  TRANSCRIPT_SENDER_LABEL,
  TRANSCRIPT_UNKNOWN_SENDER_LABEL,
} from '@/modules/panel/panel.constant';
import type {
  ExportConversationDependencies,
  ExportConversationTranscriptParams,
  ExportConversationTranscriptResult,
} from '@/modules/panel/types/panel.types';

/**
 * Exportar e uma acao sensivel: leva conversa de cliente para fora do sistema.
 *
 * Por isso a trilha de auditoria e parte do caso de uso, e nao da rota — quem exportou, de qual
 * conversa e de qual endereco fica registrado antes do arquivo existir.
 */
export class ExportConversationTranscriptUseCase {
  constructor(private readonly dependencies: ExportConversationDependencies) {}

  async execute({
    conversationId,
    agentId,
    ipAddress,
  }: ExportConversationTranscriptParams): Promise<ExportConversationTranscriptResult> {
    const { resolveConversation, messages, recordAudit, companyId } = this.dependencies;
    const conversation = await resolveConversation.execute(conversationId);

    const rows = await messages.listByConversation({
      companyId,
      sessionId: conversation.conversationId,
      limit: PANEL_TRANSCRIPT_EXPORT_LIMIT,
    });

    await recordAudit.execute({
      actorType: ACTOR_TYPE.AGENT,
      actorId: agentId,
      action: AUDIT_ACTION.CONVERSATION_EXPORTED,
      targetType: AUDIT_TARGET.CONVERSATION,
      targetId: conversation.conversationId,
      ipAddress,
    });

    return {
      transcript: rows.map(toTranscriptLine).join('\n'),
      filename: `conversa-${conversation.conversationId}.txt`,
    };
  }
}

/** Midia e lista interativa nao tem texto proprio; o marcador preserva a ordem do dialogo. */
function toTranscriptLine(row: MessageRow): string {
  const label = TRANSCRIPT_SENDER_LABEL[row.sender] ?? TRANSCRIPT_UNKNOWN_SENDER_LABEL;
  const body = row.content ?? `[${row.type}]`;

  return `[${row.createdAt.toISOString()}] ${label}: ${body}`;
}
