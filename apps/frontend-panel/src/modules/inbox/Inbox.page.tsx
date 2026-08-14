/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { ConversationsProvider, ConversationsWorkspace } from '@adatechnology/conversations-ui';

import { adaConversationsApi } from '@/modules/inbox/adaConversations.api';
import { useConversationSimulator } from '@/modules/inbox/conversationSimulator.hook';
import inboxLocale from '@/modules/inbox/inbox.locale.json';
import { panelSseProvider } from '@/modules/inbox/panelSse.provider';
import { CONVERSATION_URL_KEY } from '@/modules/shared/navigation/panelSection.constant';

/**
 * A tela e o `ConversationsWorkspace` inteiro, e nao pecas dele remontadas.
 *
 * Lista, transcript, composer e filtros ja vem compostos e conversando entre si pelo provider; o que
 * este produto muda entra por `labels`. Responder a exigencia de assumir antes de escrever tambem
 * vem do pacote: a API recusa o envio de quem nao assumiu, e a UI precisa dizer isso antes do clique.
 */
export function InboxPage() {
  const simulator = useConversationSimulator();

  /** Chegou de Clientes com uma conversa no endereco: abrir ja nela poupa procurar na fila. */
  const initialConversationId = new URLSearchParams(window.location.search).get(CONVERSATION_URL_KEY);

  return (
    <ConversationsProvider api={adaConversationsApi} sse={panelSseProvider}>
      <ConversationsWorkspace
        className="h-full"
        labels={inboxLocale.labels}
        requireTakeoverToReply
        {...(simulator ? { simulator } : {})}
        {...(initialConversationId ? { initialConversationId } : {})}
      />
    </ConversationsProvider>
  );
}
