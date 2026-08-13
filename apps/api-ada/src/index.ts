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
import { agentRoutes } from '@/modules/agent/agent.controller';
import { authenticateRequest } from '@/modules/agent/authenticateRequest';
import { catalogRoutes } from '@/modules/catalog/catalog.controller';
import { metaCatalogRoutes } from '@/modules/channel/meta/metaCatalog.controller';
import { whatsappRoutes } from '@/modules/channel/whatsapp/whatsapp.controller';
import { widgetRoutes } from '@/modules/channel/widget/widget.controller';
import { panelFlowRoutes } from '@/modules/flow/flow.controller';
import { healthRoutes } from '@/modules/health/health.controller';
import { panelConversationRoutes } from '@/modules/panel/conversation.controller';
import { panelConversationActionRoutes } from '@/modules/panel/conversationAction.controller';
import { panelDocumentRoutes } from '@/modules/panel/document.controller';
import { panelLeadRoutes } from '@/modules/panel/lead.controller';
import { panelRealtimeRoutes } from '@/modules/panel/realtime.controller';
import { panelSettingsRoutes } from '@/modules/settings/settings.controller';
import { panelTemplateRoutes } from '@/modules/settings/template.controller';
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
  ...panelSettingsRoutes,
  ...panelTemplateRoutes,
  ...catalogRoutes,
];

const handleRequest = createRouter({ routes, authenticate: authenticateRequest });

const server = Bun.serve({
  port: environment.API_PORT,
  // O `server` chega ao router so por aqui, e e dele que sai o IP do socket do rate limit.
  fetch: (request, bunServer) => handleRequest(request, bunServer),
  // SSE fica aberto de proposito; o corte padrao derrubaria o widget a cada poucos minutos.
  idleTimeout: 0,
});

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

  await server.stop(false);
  await Promise.allSettled([closeDatabase(), closeRedis()]);

  clearTimeout(forceExit);
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
