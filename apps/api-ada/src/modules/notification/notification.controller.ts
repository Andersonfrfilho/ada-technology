/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { createModuleFetchRouter } from '@adatechnology/module-http/fetch';
import { createNotificationRoutes } from '@adatechnology/notification-module';

import { notificationModule } from '@/infra/container';
import type { Route } from '@/infra/http/router';
import { NOTIFICATION_BASE_PATH } from '@/modules/notification/notification.constant';
import { notificationAuthResolver } from '@/modules/notification/notificationAuthResolver';
import { buildNotificationRoutes } from '@/modules/notification/notificationRouteBridge';

/**
 * Sem `webhookSecret`: o recibo de entrega so faz sentido com driver que chama de volta (Resend,
 * SES), e publicar a rota sem segredo aceitaria qualquer payload — o oposto de fail-closed
 * (`security.md` §3). Quando o recibo for ligado, o segredo entra aqui pelo ambiente.
 *
 * O router vem do `module-http` direto porque o pacote nao publica subcaminho `http/fetch` proprio,
 * ao contrario de catalogo, agenda e usuario. E o mesmo despachante.
 */
const moduleRoutes = createNotificationRoutes({ module: notificationModule });

const moduleRouter = createModuleFetchRouter({
  routes: moduleRoutes,
  basePath: NOTIFICATION_BASE_PATH,
  authResolver: notificationAuthResolver,
});

export const notificationRoutes: readonly Route[] = buildNotificationRoutes({
  moduleRoutes,
  handle: (request) => moduleRouter.handle(request),
});
