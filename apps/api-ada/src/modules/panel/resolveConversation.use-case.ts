/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { PanelConversationNotFoundError } from '@/modules/panel/panel.error';
import type { ConversationRef, ResolveConversationDependencies } from '@/modules/panel/types/panel.types';

/**
 * Porta unica entre o id que o painel conhece e a chave que o modulo entende.
 *
 * Toda rota do painel passa por aqui antes de tocar na conversa. E o ponto onde "existe" e "e desta
 * empresa" viram a mesma pergunta, e onde o numero de telefone entra em cena — depois dela, nunca
 * antes.
 */
export class ResolveConversationUseCase {
  constructor(private readonly dependencies: ResolveConversationDependencies) {}

  async execute(conversationId: string): Promise<ConversationRef> {
    const { conversations, companyId } = this.dependencies;
    const found = await conversations.findById({ companyId, conversationId });

    if (!found) throw new PanelConversationNotFoundError(conversationId);

    return found;
  }
}
