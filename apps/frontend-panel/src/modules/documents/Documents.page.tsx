/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { ConversationsProvider, DocumentsWorkspace } from '@adatechnology/conversations-ui';

import { adaConversationsApi } from '@/modules/inbox/adaConversations.api';
import { panelSseProvider } from '@/modules/inbox/panelSse.provider';
import { CONVERSATION_URL_KEY, PANEL_SECTION } from '@/modules/shared/navigation/panelSection.constant';
import { usePanelSection } from '@/modules/shared/navigation/panelSection.hook';

/**
 * Filtro de data e de categoria ficam de fora.
 *
 * A rota de documentos so entende `search`, `source`, `sortDirection` e paginacao; um seletor de
 * periodo desenhado aqui mandaria parametro que o servidor descarta, e o operador leria a lista
 * inteira como se estivesse filtrada.
 */
export function DocumentsPage() {
  const { navigate } = usePanelSection();

  function handleOpenConversation(conversationId: string): void {
    navigate(PANEL_SECTION.CONVERSATIONS, { [CONVERSATION_URL_KEY]: conversationId });
  }

  return (
    <section className="h-full overflow-y-auto p-4 desktop:p-6">
      <ConversationsProvider api={adaConversationsApi} sse={panelSseProvider}>
        <DocumentsWorkspace
          categories={[]}
          dateFilter={false}
          onOpenConversation={handleOpenConversation}
        />
      </ConversationsProvider>
    </section>
  );
}
