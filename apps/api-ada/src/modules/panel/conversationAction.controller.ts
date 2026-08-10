/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import {
  exportConversationTranscript,
  releaseConversation,
  takeoverConversation,
} from '@/infra/container';
import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { jsonData, noContent } from '@/infra/http/responses';
import { AUTH_REQUIREMENT, HTTP_METHOD, requireAgent, type Route } from '@/infra/http/router';
import { conversationIdSchema } from '@/modules/panel/panel.schema';

const TAKEOVER_PATH = '/v1/panel/conversations/:conversationId/takeover';
const RELEASE_PATH = '/v1/panel/conversations/:conversationId/release';
const TRANSCRIPT_PATH = '/v1/panel/conversations/:conversationId/transcript';

/**
 * As tres acoes do atendente que deixam trilha.
 *
 * Assumir cala o bot, devolver o traz de volta, exportar tira a conversa do sistema — nenhuma delas
 * pode acontecer sem se saber quem fez, quando e de onde. A auditoria mora nos use-cases, que sao os
 * unicos que ja resolveram o id opaco; a rota so entrega quem chamou e o endereco.
 */
const takeoverRoute: Route = {
  method: HTTP_METHOD.POST,
  path: TAKEOVER_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async (context) => {
    const conversationId = conversationIdSchema.parse(context.params.conversationId);
    const { agentId } = requireAgent(context);

    await takeoverConversation.execute({ conversationId, agentId, ipAddress: context.clientAddress });

    return noContent();
  },
};

const releaseRoute: Route = {
  method: HTTP_METHOD.POST,
  path: RELEASE_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async (context) => {
    const conversationId = conversationIdSchema.parse(context.params.conversationId);
    const { agentId } = requireAgent(context);

    await releaseConversation.execute({ conversationId, agentId, ipAddress: context.clientAddress });

    return noContent();
  },
};

/** Le, mas limitada como escrita: exportar copia a conversa inteira para fora, e isso tem custo. */
const transcriptRoute: Route = {
  method: HTTP_METHOD.GET,
  path: TRANSCRIPT_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async (context) => {
    const conversationId = conversationIdSchema.parse(context.params.conversationId);
    const { agentId } = requireAgent(context);

    const result = await exportConversationTranscript.execute({
      conversationId,
      agentId,
      ipAddress: context.clientAddress,
    });

    return jsonData(result);
  },
};

export const panelConversationActionRoutes: readonly Route[] = [
  takeoverRoute,
  releaseRoute,
  transcriptRoute,
];
