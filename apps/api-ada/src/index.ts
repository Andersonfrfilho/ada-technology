/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { closeRedis } from '@/infra/cache/redisClient';
import { environment } from '@/infra/config/environment';
import { closeDatabase } from '@/infra/database/client';
import { createRouter, type Route } from '@/infra/http/router';
import { startScheduler } from '@/infra/scheduler/scheduler';
import {
  catalogModule,
  notificationBullQueue,
  notificationWorker,
  seedNotificationTemplates,
} from '@/infra/container';
import { BULL_BOARD_BASE_PATH } from '@/infra/queue/bullBoard.constant';
import { createBullBoardHandler } from '@/infra/queue/bullBoard';
import { agentRoutes } from '@/modules/agent/agent.controller';
import { authenticateRequest } from '@/modules/agent/authenticateRequest';
import { catalogRoutes } from '@/modules/catalog/catalog.controller';
import { productImageRoutes } from '@/modules/catalog/productImage.controller';
import { metaCatalogRoutes } from '@/modules/channel/meta/metaCatalog.controller';
import { whatsappRoutes } from '@/modules/channel/whatsapp/whatsapp.controller';
import { widgetRoutes } from '@/modules/channel/widget/widget.controller';
import { panelFlowRoutes } from '@/modules/flow/flow.controller';
import { healthRoutes } from '@/modules/health/health.controller';
import { notificationAttachmentRoutes } from '@/modules/notification/notificationAttachment.controller';
import { notificationTestRoutes } from '@/modules/notification/notificationTest.controller';
import { notificationRoutes } from '@/modules/notification/notification.controller';
import { panelConversationRoutes } from '@/modules/panel/conversation.controller';
import { panelConversationActionRoutes } from '@/modules/panel/conversationAction.controller';
import { panelDocumentRoutes } from '@/modules/panel/document.controller';
import { panelLeadRoutes } from '@/modules/panel/lead.controller';
import { panelRealtimeRoutes } from '@/modules/panel/realtime.controller';
import { schedulingRoutes } from '@/modules/scheduling/scheduling.controller';
import { panelSettingsRoutes } from '@/modules/settings/settings.controller';
import { panelTemplateRoutes } from '@/modules/settings/template.controller';
import { panelSimulationRoutes } from '@/modules/simulation/simulation.controller';
import { userRoutes } from '@/modules/user/user.controller';
import { logger } from '@/shared/logger';

const SOURCE = 'index';
const SHUTDOWN_TIMEOUT_MS = 10_000;

const routes: readonly Route[] = [
  ...healthRoutes,
  ...whatsappRoutes,
  ...metaCatalogRoutes,
  ...widgetRoutes,
  ...agentRoutes,
  ...panelConversationRoutes,
  ...panelConversationActionRoutes,
  ...panelLeadRoutes,
  ...panelDocumentRoutes,
  ...panelRealtimeRoutes,
  ...panelFlowRoutes,
  ...schedulingRoutes,
  ...panelSettingsRoutes,
  ...panelTemplateRoutes,
  ...panelSimulationRoutes,
  ...catalogRoutes,
  ...productImageRoutes,
  ...userRoutes,
  ...notificationRoutes,
  ...notificationAttachmentRoutes,
  ...notificationTestRoutes,
];

const handleRequest = createRouter({ routes, authenticate: authenticateRequest });

/**
 * O painel da fila, so quando ha credencial. Sem `BULL_BOARD_USER` a constante fica `undefined` e
 * nem a rota existe — um 404 identico ao de qualquer caminho desconhecido, sem revelar que o painel
 * poderia existir.
 */
const handleBullBoard = environment.BULL_BOARD_USER
  ? createBullBoardHandler(notificationBullQueue)
  : undefined;

const server = Bun.serve({
  port: environment.API_PORT,
  // O `server` chega ao router so por aqui, e e dele que sai o IP do socket do rate limit.
  fetch: (request, bunServer) => {
    // Antes do roteador, por PREFIXO: o Bull Board serve dezenas de caminhos sob a base, e o
    // roteador daqui casa caminho exato.
    if (handleBullBoard && new URL(request.url).pathname.startsWith(BULL_BOARD_BASE_PATH)) {
      return handleBullBoard(request);
    }

    return handleRequest(request, bunServer);
  },
  // SSE fica aberto de proposito; o corte padrao derrubaria o widget a cada poucos minutos.
  idleTimeout: 0,
});

/**
 * Sem `META_CATALOG_*` o modulo devolve lista de agendamentos vazia, e o relogio nem sobe: quem so
 * usa o catalogo interno nao paga por um timer que nao tem o que sincronizar.
 */
const scheduler = startScheduler({
  tasks: catalogModule.schedules,
  companyId: environment.ADA_COMPANY_ID,
});

/**
 * A fila de notificacao e em processo (ver `container.ts`): sem este `start`, a entrega nasce
 * `queued`, fica no backlog da fila e o e-mail nunca sai.
 */
await notificationWorker.start();

/**
 * Semeia so o que falta, entao rodar a cada boot e barato e nao pisa na copy editada pelo painel.
 * Falha aqui nao derruba a API: sem template, a redefinicao de senha ainda sai pelo envio direto
 * de emergencia — degradado, nao morto.
 */
try {
  const seeded = await seedNotificationTemplates.execute();
  if (seeded > 0) {
    logger.info({ message: 'Templates de notificacao semeados', source: SOURCE, meta: { count: seeded } });
  }
} catch (error) {
  logger.error({ message: 'Falha ao semear templates de notificacao', source: SOURCE, meta: { error: String(error) } });
}

logger.info({
  message: 'API no ar',
  source: SOURCE,
  meta: { port: server.port, env: environment.ENV, whatsappEnabled: environment.WHATSAPP_ENABLED },
});

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ message: 'Desligando', source: SOURCE, meta: { signal } });

  // Timeout de forca: um pool travado nao pode segurar o container para sempre.
  const forceExit = setTimeout(() => {
    logger.error({ message: 'Desligamento excedeu o limite, encerrando a forca', source: SOURCE });
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  scheduler.stop();
  await notificationWorker.stop();
  await server.stop(false);
  await Promise.allSettled([closeDatabase(), closeRedis()]);

  clearTimeout(forceExit);
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
