/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { environment } from '@/infra/config/environment';
import {
  metaWhatsApp,
  postWidgetMessage,
  realtime,
  startWidgetSession,
  transcriptMessages,
} from '@/infra/container';
import { isWidgetOriginAllowed } from '@/infra/http/cors';
import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { readJsonBody } from '@/infra/http/requestBody';
import { jsonData } from '@/infra/http/responses';
import { HTTP_METHOD, type Route } from '@/infra/http/router';
import { createSseResponse } from '@/infra/http/sse';
import { WidgetOriginNotAllowedError } from '@/modules/channel/channel.error';
import {
  isWidgetSessionId,
  WIDGET_TRANSCRIPT_DEFAULT_LIMIT,
} from '@/modules/channel/widget/widget.constant';
import { WidgetSessionNotFoundError } from '@/modules/channel/widget/widget.error';
import { toWidgetMessage } from '@/modules/channel/widget/widget.mapper';
import {
  widgetMessageSchema,
  widgetTranscriptQuerySchema,
} from '@/modules/channel/widget/widget.schema';
import { conversationRealtimeChannel } from '@/modules/shared/realtime.constant';

const SESSIONS_PATH = '/v1/widget/sessions';
const MESSAGES_PATH = '/v1/widget/sessions/:sessionId/messages';
const EVENTS_PATH = '/v1/widget/sessions/:sessionId/events';

const CREATED = 201;

function assertAllowedOrigin(request: Request): void {
  if (!isWidgetOriginAllowed(request.headers.get('origin'))) throw new WidgetOriginNotAllowedError();
}

/**
 * Fronteira de autorizacao destas rotas.
 *
 * Sessao de widget e sessao de WhatsApp dividem a mesma tabela. Sem esta checagem, bastaria mandar
 * um numero de telefone no lugar do id para ler a conversa de um cliente real — e o id do widget e
 * aleatorio justamente para nao ser adivinhavel.
 */
function assertWidgetSession(sessionId: string | undefined): string {
  if (!sessionId || !isWidgetSessionId(sessionId)) throw new WidgetSessionNotFoundError();

  return sessionId;
}

const createSessionRoute: Route = {
  method: HTTP_METHOD.POST,
  path: SESSIONS_PATH,
  rateLimit: RATE_LIMIT.WIDGET_SESSION_CREATE,
  handler: async ({ request }) => {
    assertAllowedOrigin(request);

    const result = await startWidgetSession.execute();

    return jsonData(result, CREATED);
  },
};

const postMessageRoute: Route = {
  method: HTTP_METHOD.POST,
  path: MESSAGES_PATH,
  rateLimit: RATE_LIMIT.WIDGET_MESSAGE_SEND,
  handler: async ({ request, params }) => {
    assertAllowedOrigin(request);

    const sessionId = assertWidgetSession(params.sessionId);
    const { text } = widgetMessageSchema.parse(await readJsonBody(request));

    const result = await postWidgetMessage.execute({ sessionId, text });

    return jsonData(result);
  },
};

/**
 * Le a tabela em vez do `listMessages` do modulo, pelo mesmo motivo do painel.
 *
 * O use-case do modulo ordena crescente e corta pelo limite: passada a janela, ele devolve o comeco
 * do dialogo e o visitante fica preso na saudacao, sem ver a resposta que acabou de chegar. Nao ha
 * cursor "depois de" para escapar disso — a correcao e buscar do fim.
 */
const listMessagesRoute: Route = {
  method: HTTP_METHOD.GET,
  path: MESSAGES_PATH,
  rateLimit: RATE_LIMIT.WIDGET_TRANSCRIPT_READ,
  handler: async ({ url, params }) => {
    const sessionId = assertWidgetSession(params.sessionId);
    const query = widgetTranscriptQuerySchema.parse(Object.fromEntries(url.searchParams));

    const session = await metaWhatsApp.conversations.repository.getContext(
      environment.ADA_COMPANY_ID,
      sessionId,
    );
    if (!session) throw new WidgetSessionNotFoundError();

    const rows = await transcriptMessages.listByConversation({
      companyId: environment.ADA_COMPANY_ID,
      sessionId: session.id,
      limit: query.limit ?? WIDGET_TRANSCRIPT_DEFAULT_LIMIT,
      ...(query.before ? { before: query.before } : {}),
    });

    return jsonData(rows.map(toWidgetMessage));
  },
};

/**
 * O evento avisa que mudou, sem dizer o que: o navegador rebusca o transcript.
 *
 * Assim a mensagem trafega uma unica vez, pela rota que ja filtra os campos internos — o evento em
 * si nunca carrega conteudo de conversa.
 */
const eventsRoute: Route = {
  method: HTTP_METHOD.GET,
  path: EVENTS_PATH,
  rateLimit: RATE_LIMIT.WIDGET_EVENTS_SUBSCRIBE,
  handler: ({ params }) => {
    const sessionId = assertWidgetSession(params.sessionId);

    return createSseResponse({
      subscribe: (emit) => realtime.subscribe(conversationRealtimeChannel(sessionId), emit),
    });
  },
};

export const widgetRoutes: readonly Route[] = [
  createSessionRoute,
  postMessageRoute,
  listMessagesRoute,
  eventsRoute,
];
