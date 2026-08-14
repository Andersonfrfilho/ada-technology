/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { environment } from '@/infra/config/environment';
import { simulateInboundMessage } from '@/infra/container';
import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { readJsonBody } from '@/infra/http/requestBody';
import { jsonData, noContent } from '@/infra/http/responses';
import { AUTH_REQUIREMENT, HTTP_METHOD, requireAgent, type Route } from '@/infra/http/router';
import { readWidgetAudioUpload } from '@/modules/channel/widget/widgetAudioUpload';
import { PANEL_CHANNEL } from '@/modules/panel/panel.constant';
import { conversationIdSchema } from '@/modules/panel/panel.schema';
import {
  SIMULATION_COMMAND_KIND,
  SIMULATION_FORBIDDEN_ENV,
  WEBCHAT_SIMULATION_MEDIA_KINDS,
  WHATSAPP_SIMULATION_MEDIA_KINDS,
} from '@/modules/simulation/simulation.constant';
import { simulationCommandSchema } from '@/modules/simulation/simulation.schema';
import type { SimulationCapability } from '@/modules/simulation/types/simulation.types';

const CAPABILITY_PATH = '/v1/panel/simulation';
const COMMAND_PATH = '/v1/panel/conversations/:conversationId/simulation';
const AUDIO_PATH = '/v1/panel/conversations/:conversationId/simulation/audio';

/**
 * O que este ambiente sabe simular, para o painel nao desenhar um botao que falha ao ser tocado.
 *
 * O chat do site simula sempre: as rotas dele vivem nesta mesma API. O WhatsApp depende do canal
 * ligado, porque sem segredo de app nao ha como assinar o webhook que a Meta assinaria.
 */
const capabilities: readonly SimulationCapability[] = [
  { channel: PANEL_CHANNEL.WEBCHAT, acceptedMediaKinds: WEBCHAT_SIMULATION_MEDIA_KINDS },
  ...(environment.WHATSAPP_ENABLED
    ? [{ channel: PANEL_CHANNEL.WHATSAPP, acceptedMediaKinds: WHATSAPP_SIMULATION_MEDIA_KINDS }]
    : []),
];

const capabilityRoute: Route = {
  method: HTTP_METHOD.GET,
  path: CAPABILITY_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_READ,
  handler: () => jsonData({ channels: capabilities }),
};

/**
 * O navegador manda o comando, nunca o payload do canal.
 *
 * Aceitar payload pronto transformaria esta rota num injetor de webhook arbitrario para quem tivesse
 * sessao de atendente; aqui ela so escolhe entre "texto" e "toque nesta opcao".
 */
const commandRoute: Route = {
  method: HTTP_METHOD.POST,
  path: COMMAND_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async (context) => {
    const conversationId = conversationIdSchema.parse(context.params.conversationId);
    const { agentId } = requireAgent(context);
    const command = simulationCommandSchema.parse(await readJsonBody(context.request));

    await simulateInboundMessage.execute({
      conversationId,
      command,
      agentId,
      ipAddress: context.clientAddress,
    });

    return noContent();
  },
};

/**
 * Audio entra pelo mesmo multipart e pelo mesmo teto do visitante do site.
 *
 * Rota separada porque bytes nao cabem no JSON do comando; o caso de uso recusa o canal que nao
 * sabe receber audio simulado.
 */
const audioRoute: Route = {
  method: HTTP_METHOD.POST,
  path: AUDIO_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.WIDGET_AUDIO_SEND,
  handler: async (context) => {
    const conversationId = conversationIdSchema.parse(context.params.conversationId);
    const { agentId } = requireAgent(context);
    const audio = await readWidgetAudioUpload(context.request);

    await simulateInboundMessage.execute({
      conversationId,
      command: { kind: SIMULATION_COMMAND_KIND.AUDIO, audio },
      agentId,
      ipAddress: context.clientAddress,
    });

    return noContent();
  },
};

export const panelSimulationRoutes: readonly Route[] =
  environment.ENV === SIMULATION_FORBIDDEN_ENV ? [] : [capabilityRoute, commandRoute, audioRoute];
