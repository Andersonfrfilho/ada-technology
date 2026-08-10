/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { FLOW_ACTION_KIND } from '@adatechnology/meta-whatsapp-contracts';

import type { RegisterConversationFlowActionsParams } from '@/modules/conversation/types/conversation.types';
import { HANDOFF_REASON } from '@/shared/constants/domain.constant';

/**
 * Liga os nos de acao do grafo ao atendimento humano.
 *
 * O handler nao devolve `next`, e o interpretador entao cai em `resolveNext(node)`: um no de
 * handoff **nao pode declarar `next`**, ou o fluxo segue andando depois de entregar a conversa.
 */
export function registerConversationFlowActions({
  registry,
  requestHandoff,
}: RegisterConversationFlowActionsParams): void {
  const handoffHandler = async ({
    session,
    channel,
  }: {
    readonly session: { readonly whatsappNumber: string };
    readonly channel: Parameters<typeof requestHandoff.execute>[0]['channel'];
  }): Promise<void> => {
    await requestHandoff.execute({
      whatsappNumber: session.whatsappNumber,
      channel,
      reason: HANDOFF_REASON.FLOW_ACTION,
    });
  };

  registry.registerFlowAction(FLOW_ACTION_KIND.HANDOFF, handoffHandler);

  // O limite de frequencia e do produto que publicou o grafo, nao deste bot: aqui os dois nos
  // significam a mesma coisa — chamar uma pessoa.
  registry.registerFlowAction(FLOW_ACTION_KIND.RATE_LIMITED_HANDOFF, handoffHandler);
}
