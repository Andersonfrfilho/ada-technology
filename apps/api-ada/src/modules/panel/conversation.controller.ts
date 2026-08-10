/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type {
  ListConversationDocumentsParams,
  ListConversationsFilters,
} from '@adatechnology/meta-whatsapp-module';
import type { z } from 'zod';

import { environment } from '@/infra/config/environment';
import {
  metaWhatsApp,
  resolvePanelConversation,
  sendPanelMessage,
  transcriptMessages,
} from '@/infra/container';
import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { readJsonBody } from '@/infra/http/requestBody';
import { jsonData, noContent } from '@/infra/http/responses';
import { AUTH_REQUIREMENT, HTTP_METHOD, requireAgent, type Route } from '@/infra/http/router';
import {
  PANEL_CONVERSATION_DEFAULT_LIMIT,
  PANEL_DOCUMENTS_DEFAULT_LIMIT,
  PANEL_TRANSCRIPT_DEFAULT_LIMIT,
} from '@/modules/panel/panel.constant';
import { toPanelConversation, toPanelMessage } from '@/modules/panel/panel.mapper';
import {
  conversationIdSchema,
  panelConversationQuerySchema,
  panelDocumentsQuerySchema,
  panelMessageSchema,
  panelTranscriptQuerySchema,
} from '@/modules/panel/panel.schema';

const CONVERSATIONS_PATH = '/v1/panel/conversations';
const ALL_READ_PATH = '/v1/panel/conversations/read';
const MESSAGES_PATH = '/v1/panel/conversations/:conversationId/messages';
const READ_PATH = '/v1/panel/conversations/:conversationId/read';
const CONTEXT_PATH = '/v1/panel/conversations/:conversationId/context';
const DOCUMENTS_PATH = '/v1/panel/conversations/:conversationId/documents';

const companyId = environment.ADA_COMPANY_ID;

/**
 * A lista sai sem `total`.
 *
 * `ListConversationsUseCase` devolve so a pagina, e um total inventado aqui seria pior que a
 * ausencia dele: a UI aceita as duas formas, e paginar por um numero errado esconde conversa.
 */
const listRoute: Route = {
  method: HTTP_METHOD.GET,
  path: CONVERSATIONS_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_READ,
  handler: async ({ url }) => {
    const query = panelConversationQuerySchema.parse(Object.fromEntries(url.searchParams));

    const conversations = await metaWhatsApp.conversations.list.execute({
      companyId,
      filters: toConversationFilters(query),
    });

    return jsonData(conversations.map(toPanelConversation));
  },
};

const listMessagesRoute: Route = {
  method: HTTP_METHOD.GET,
  path: MESSAGES_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_READ,
  handler: async ({ url, params }) => {
    const conversationId = conversationIdSchema.parse(params.conversationId);
    const query = panelTranscriptQuerySchema.parse(Object.fromEntries(url.searchParams));
    const conversation = await resolvePanelConversation.execute(conversationId);

    const rows = await transcriptMessages.listByConversation({
      companyId,
      sessionId: conversation.conversationId,
      limit: query.limit ?? PANEL_TRANSCRIPT_DEFAULT_LIMIT,
      ...(query.before ? { before: query.before } : {}),
    });

    return jsonData(rows.map(toPanelMessage));
  },
};

/**
 * Sem linha gravada nao ha o que devolver.
 *
 * Acontece quando a mensagem colide com uma ja registrada pelo id da Meta — a gravacao e idempotente
 * de proposito. O evento de tempo real ainda chega, e a tela rebusca o transcript por ele.
 */
const sendMessageRoute: Route = {
  method: HTTP_METHOD.POST,
  path: MESSAGES_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async (context) => {
    const conversationId = conversationIdSchema.parse(context.params.conversationId);
    const { text } = panelMessageSchema.parse(await readJsonBody(context.request));
    const { agentId } = requireAgent(context);

    const row = await sendPanelMessage.execute({ conversationId, text, agentId });
    if (!row) return noContent();

    return jsonData(toPanelMessage(row));
  },
};

const markReadRoute: Route = {
  method: HTTP_METHOD.POST,
  path: READ_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async ({ params }) => {
    const conversationId = conversationIdSchema.parse(params.conversationId);
    const conversation = await resolvePanelConversation.execute(conversationId);

    await metaWhatsApp.conversations.repository.markRead(companyId, conversation.conversationKey);

    return noContent();
  },
};

/** Marca so o que esta atribuido a quem chamou: ninguem zera a caixa do colega. */
const markAllReadRoute: Route = {
  method: HTTP_METHOD.POST,
  path: ALL_READ_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async (context) => {
    const { agentId } = requireAgent(context);
    const updated = await metaWhatsApp.conversations.repository.markAllRead(companyId, agentId);

    return jsonData({ updated });
  },
};

/** So o contexto do fluxo: a linha da sessao carrega o numero, e ele nao sobe para o navegador. */
const contextRoute: Route = {
  method: HTTP_METHOD.GET,
  path: CONTEXT_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_READ,
  handler: async ({ params }) => {
    const conversationId = conversationIdSchema.parse(params.conversationId);
    const conversation = await resolvePanelConversation.execute(conversationId);

    const session = await metaWhatsApp.conversations.repository.getContext(
      companyId,
      conversation.conversationKey,
    );

    return jsonData(session?.context ?? {});
  },
};

const documentsRoute: Route = {
  method: HTTP_METHOD.GET,
  path: DOCUMENTS_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_READ,
  handler: async ({ url, params }) => {
    const conversationId = conversationIdSchema.parse(params.conversationId);
    const query = panelDocumentsQuerySchema.parse(Object.fromEntries(url.searchParams));
    const conversation = await resolvePanelConversation.execute(conversationId);

    const page = await metaWhatsApp.conversations.listDocuments.execute({
      companyId,
      whatsappNumber: conversation.conversationKey,
      ...toDocumentFilters(query),
    });

    return jsonData(page);
  },
};

type ConversationQuery = z.infer<typeof panelConversationQuerySchema>;
type DocumentsQuery = z.infer<typeof panelDocumentsQuerySchema>;

/**
 * Espalhar o resultado do zod direto no filtro nao compila: `exactOptionalPropertyTypes` separa
 * "chave ausente" de "chave com `undefined`", e o zod produz a segunda forma.
 */
function toConversationFilters(query: ConversationQuery): ListConversationsFilters {
  return {
    limit: query.limit ?? PANEL_CONVERSATION_DEFAULT_LIMIT,
    ...(query.page ? { page: query.page } : {}),
    ...(query.waitingHuman === undefined ? {} : { waitingHuman: query.waitingHuman }),
    ...(query.search ? { search: query.search } : {}),
  };
}

type DocumentFilters = Omit<ListConversationDocumentsParams, 'companyId' | 'whatsappNumber'>;

function toDocumentFilters(query: DocumentsQuery): DocumentFilters {
  return {
    limit: query.limit ?? PANEL_DOCUMENTS_DEFAULT_LIMIT,
    ...(query.page ? { page: query.page } : {}),
    ...(query.search ? { search: query.search } : {}),
    ...(query.sortDirection ? { sortDirection: query.sortDirection } : {}),
    ...(query.source && query.source.length > 0 ? { sources: query.source } : {}),
  };
}

export const panelConversationRoutes: readonly Route[] = [
  listRoute,
  markAllReadRoute,
  listMessagesRoute,
  sendMessageRoute,
  markReadRoute,
  contextRoute,
  documentsRoute,
];
