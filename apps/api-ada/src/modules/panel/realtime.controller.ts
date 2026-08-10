/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { realtime, realtimeTickets, resolvePanelConversation } from '@/infra/container';
import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { readJsonBody } from '@/infra/http/requestBody';
import { jsonData } from '@/infra/http/responses';
import { AUTH_REQUIREMENT, HTTP_METHOD, requireAgent, type Route } from '@/infra/http/router';
import { createSseResponse } from '@/infra/http/sse';
import { RealtimeTicketInvalidError } from '@/modules/panel/panel.error';
import { conversationIdSchema, realtimeTicketQuerySchema, realtimeTicketSchema } from '@/modules/panel/panel.schema';
import type { RealtimeTicketPayload } from '@/modules/panel/types/panel.types';
import { conversationRealtimeChannel, GLOBAL_REALTIME_CHANNEL } from '@/modules/shared/realtime.constant';

const TICKETS_PATH = '/v1/panel/realtime/tickets';
const GLOBAL_EVENTS_PATH = '/v1/panel/events';
const CONVERSATION_EVENTS_PATH = '/v1/panel/conversations/:conversationId/events';

const CREATED = 201;

/**
 * Onde a autenticacao do stream acontece.
 *
 * `EventSource` nao manda cabecalho, entao as rotas de evento abaixo nao declaram `auth` — quem
 * autoriza e o bilhete emitido aqui, nesta rota que exige token. Pedir com `conversationId` amarra o
 * bilhete aquela conversa, e a amarracao e conferida na abertura do stream.
 */
const issueTicketRoute: Route = {
  method: HTTP_METHOD.POST,
  path: TICKETS_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async (context) => {
    const { conversationId } = realtimeTicketSchema.parse(await readJsonBody(context.request));
    const { agentId } = requireAgent(context);

    const ticket = await realtimeTickets.issue(await buildTicketPayload({ agentId, conversationId }));

    return jsonData({ ticket }, CREATED);
  },
};

/** O painel inteiro escuta este canal para saber que alguma conversa mudou — o evento nao diz qual. */
const globalEventsRoute: Route = {
  method: HTTP_METHOD.GET,
  path: GLOBAL_EVENTS_PATH,
  rateLimit: RATE_LIMIT.PANEL_READ,
  handler: async ({ url }) => {
    await redeemTicket(url);

    return createSseResponse({
      subscribe: (emit) => realtime.subscribe(GLOBAL_REALTIME_CHANNEL, emit),
    });
  },
};

/**
 * O canal vem do bilhete, nunca do caminho.
 *
 * Assim a abertura do stream nao consulta o banco, e um bilhete emitido para uma conversa nao
 * consegue escutar outra: a chave que ele carrega ja foi resolvida sob o `companyId` de quem pediu.
 */
const conversationEventsRoute: Route = {
  method: HTTP_METHOD.GET,
  path: CONVERSATION_EVENTS_PATH,
  rateLimit: RATE_LIMIT.PANEL_READ,
  handler: async ({ url, params }) => {
    const conversationId = conversationIdSchema.parse(params.conversationId);
    const ticket = await redeemTicket(url);

    if (ticket.conversationId !== conversationId || !ticket.conversationKey) {
      throw new RealtimeTicketInvalidError();
    }

    const channel = conversationRealtimeChannel(ticket.conversationKey);

    return createSseResponse({ subscribe: (emit) => realtime.subscribe(channel, emit) });
  },
};

type BuildTicketPayloadParams = {
  readonly agentId: string;
  /** `undefined` explicito: o zod devolve a chave presente e vazia quando o corpo vem sem conversa. */
  readonly conversationId: string | undefined;
};

async function buildTicketPayload({
  agentId,
  conversationId,
}: BuildTicketPayloadParams): Promise<RealtimeTicketPayload> {
  if (!conversationId) return { agentId };

  const conversation = await resolvePanelConversation.execute(conversationId);

  return { agentId, conversationId, conversationKey: conversation.conversationKey };
}

async function redeemTicket(url: URL): Promise<RealtimeTicketPayload> {
  const { ticket } = realtimeTicketQuerySchema.parse(Object.fromEntries(url.searchParams));
  const payload = await realtimeTickets.redeem(ticket);

  if (!payload) throw new RealtimeTicketInvalidError();

  return payload;
}

export const panelRealtimeRoutes: readonly Route[] = [
  issueTicketRoute,
  globalEventsRoute,
  conversationEventsRoute,
];
