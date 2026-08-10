/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type {
  CompanyDocumentPage,
  ConversationDocumentPage,
  ConversationsApi,
  ConversationSummary,
  ListConversationsParams,
  ListDocumentsParams,
  MessagePayload,
} from '@adatechnology/conversations-ui';

import { toConversationSummary, toMessagePayload } from '@/modules/inbox/conversation.mapper';
import { CONVERSATION_PATH, MEDIA_UNSUPPORTED_MESSAGE } from '@/modules/inbox/inbox.constant';
import type { PanelConversation, PanelMessage, PanelTranscript } from '@/modules/inbox/types/inbox.types';
import { HTTP_METHOD, PANEL_PATH } from '@/modules/shared/http/http.constant';
import { panelRequest } from '@/modules/shared/http/panelHttpClient';

/**
 * A capacidade que nao existe fica de fora.
 *
 * `ConversationsApi` marca como opcional tudo que a UI so desenha quando recebe: sem
 * `uploadDocument`, o botao de anexo nao aparece — e melhor que um botao que erra ao ser clicado.
 * As de midia sao obrigatorias no contrato e lancam, porque nao ha rota que as sirva.
 */
export const adaConversationsApi: ConversationsApi = {
  async fetchConversations(params?: ListConversationsParams): Promise<ConversationSummary[]> {
    const conversations = await panelRequest<PanelConversation[]>({
      path: PANEL_PATH.CONVERSATIONS,
      query: {
        ...(params?.page === undefined ? {} : { page: params.page }),
        ...(params?.limit === undefined ? {} : { limit: params.limit }),
        ...(params?.waitingHuman === undefined ? {} : { waitingHuman: params.waitingHuman }),
        ...(params?.search ? { search: params.search } : {}),
      },
    });

    return conversations.map(toConversationSummary);
  },

  async fetchMessages(
    conversationId: string,
    params?: { limit?: number; before?: string },
  ): Promise<MessagePayload[]> {
    const messages = await panelRequest<PanelMessage[]>({
      path: CONVERSATION_PATH.MESSAGES(conversationId),
      query: {
        ...(params?.limit === undefined ? {} : { limit: params.limit }),
        ...(params?.before ? { before: params.before } : {}),
      },
    });

    return messages.map(toMessagePayload);
  },

  async sendMessage(conversationId: string, text: string): Promise<MessagePayload> {
    const message = await panelRequest<PanelMessage>({
      path: CONVERSATION_PATH.MESSAGES(conversationId),
      method: HTTP_METHOD.POST,
      body: { text },
    });

    return toMessagePayload(message);
  },

  async markRead(conversationId: string): Promise<void> {
    await panelRequest<void>({
      path: CONVERSATION_PATH.READ(conversationId),
      method: HTTP_METHOD.POST,
    });
  },

  async markAllRead(): Promise<void> {
    await panelRequest<{ updated: number }>({
      path: PANEL_PATH.MARK_ALL_READ,
      method: HTTP_METHOD.POST,
    });
  },

  async getContext(conversationId: string): Promise<Record<string, unknown>> {
    return panelRequest<Record<string, unknown>>({ path: CONVERSATION_PATH.CONTEXT(conversationId) });
  },

  async getDocuments(
    conversationId: string,
    params?: ListDocumentsParams,
  ): Promise<ConversationDocumentPage> {
    return panelRequest<ConversationDocumentPage>({
      path: CONVERSATION_PATH.DOCUMENTS(conversationId),
      query: {
        ...(params?.page === undefined ? {} : { page: params.page }),
        ...(params?.limit === undefined ? {} : { limit: params.limit }),
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.sortDirection ? { sortDirection: params.sortDirection } : {}),
        ...(params?.source ? { source: params.source } : {}),
      },
    });
  },

  /** A mesma biblioteca vista de cima, sem partir de uma conversa: e o que a tela Documentos usa. */
  async getAllDocuments(params?: ListDocumentsParams): Promise<CompanyDocumentPage> {
    return panelRequest<CompanyDocumentPage>({
      path: PANEL_PATH.DOCUMENTS,
      query: {
        ...(params?.page === undefined ? {} : { page: params.page }),
        ...(params?.limit === undefined ? {} : { limit: params.limit }),
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.sortDirection ? { sortDirection: params.sortDirection } : {}),
        ...(params?.source ? { source: params.source } : {}),
      },
    });
  },

  async takeover(conversationId: string): Promise<void> {
    await panelRequest<void>({
      path: CONVERSATION_PATH.TAKEOVER(conversationId),
      method: HTTP_METHOD.POST,
    });
  },

  async release(conversationId: string): Promise<void> {
    await panelRequest<void>({
      path: CONVERSATION_PATH.RELEASE(conversationId),
      method: HTTP_METHOD.POST,
    });
  },

  async exportTranscript(conversationId: string): Promise<PanelTranscript> {
    return panelRequest<PanelTranscript>({ path: CONVERSATION_PATH.TRANSCRIPT(conversationId) });
  },

  async sendMedia(): Promise<MessagePayload> {
    throw new Error(MEDIA_UNSUPPORTED_MESSAGE);
  },

  async sendTemplate(): Promise<void> {
    throw new Error(MEDIA_UNSUPPORTED_MESSAGE);
  },

  async getDocumentUrl(): Promise<string> {
    throw new Error(MEDIA_UNSUPPORTED_MESSAGE);
  },

  async getMediaProxyUrl(): Promise<{ mimeType: string; data: string }> {
    throw new Error(MEDIA_UNSUPPORTED_MESSAGE);
  },
};
