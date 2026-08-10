/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { ACTOR_TYPE, AUDIT_ACTION, AUDIT_TARGET } from '@/modules/audit/audit.constant';
import type {
  AssignConversationParams,
  ReleaseConversationDependencies,
} from '@/modules/panel/types/panel.types';

/**
 * Atendente devolve a conversa ao bot.
 *
 * A sessao volta ao modo automatico com a posicao do grafo intacta: a proxima mensagem do cliente
 * segue de onde tinha parado, em vez de reapresentar o menu inicial.
 */
export class ReleaseConversationUseCase {
  constructor(private readonly dependencies: ReleaseConversationDependencies) {}

  async execute({ conversationId, agentId, ipAddress }: AssignConversationParams): Promise<void> {
    const { resolveConversation, release, recordAudit, companyId } = this.dependencies;
    const conversation = await resolveConversation.execute(conversationId);

    await release.execute({ companyId, whatsappNumber: conversation.conversationKey });

    await recordAudit.execute({
      actorType: ACTOR_TYPE.AGENT,
      actorId: agentId,
      action: AUDIT_ACTION.CONVERSATION_RELEASED,
      targetType: AUDIT_TARGET.CONVERSATION,
      targetId: conversation.conversationId,
      ipAddress,
    });
  }
}
