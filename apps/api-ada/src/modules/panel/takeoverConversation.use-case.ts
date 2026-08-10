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
  TakeoverConversationDependencies,
} from '@/modules/panel/types/panel.types';

/**
 * Atendente assume a conversa: o bot cala e o grafo para de avancar.
 *
 * A trilha guarda o id da conversa, nunca o numero — e por isso que a auditoria fica aqui, depois
 * da resolucao, e nao dentro do use-case do modulo, que so conhece a chave.
 */
export class TakeoverConversationUseCase {
  constructor(private readonly dependencies: TakeoverConversationDependencies) {}

  async execute({ conversationId, agentId, ipAddress }: AssignConversationParams): Promise<void> {
    const { resolveConversation, takeover, recordAudit, companyId } = this.dependencies;
    const conversation = await resolveConversation.execute(conversationId);

    await takeover.execute({
      companyId,
      whatsappNumber: conversation.conversationKey,
      agentUserId: agentId,
    });

    await recordAudit.execute({
      actorType: ACTOR_TYPE.AGENT,
      actorId: agentId,
      action: AUDIT_ACTION.CONVERSATION_TAKEN_OVER,
      targetType: AUDIT_TARGET.CONVERSATION,
      targetId: conversation.conversationId,
      ipAddress,
    });
  }
}
