/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { ROUTE_SCOPE, type ModuleRoute, type ModuleRouteTable } from '@adatechnology/module-http';

import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { AUTH_REQUIREMENT, HTTP_METHOD, type HttpMethod, type Route } from '@/infra/http/router';
import { NOTIFICATION_BASE_PATH } from '@/modules/notification/notification.constant';

export type BuildNotificationRoutesParams = {
  readonly moduleRoutes: ModuleRouteTable;
  /** O despachante do modulo, ja montado com resolver de identidade e `basePath`. */
  readonly handle: (request: Request) => Promise<Response>;
};

/**
 * As rotas do modulo sao de escopo misto: a caixa de entrada e do atendente, template e politica de
 * categoria sao do dono, e o disparo (`service`) e chamada de maquina — que aqui so o dono alcanca.
 */
function resolveAuth(scope: ModuleRoute['scope']): Route['auth'] {
  if (scope === ROUTE_SCOPE.ADMIN || scope === ROUTE_SCOPE.SERVICE) return AUTH_REQUIREMENT.ADMIN;
  if (scope === ROUTE_SCOPE.USER) return AUTH_REQUIREMENT.AGENT;
  return undefined;
}

/** Uma rota da Ada para cada rota do modulo — sem curinga, mesma razao do `catalogRouteBridge`. */
export function buildNotificationRoutes({ moduleRoutes, handle }: BuildNotificationRoutesParams): readonly Route[] {
  return moduleRoutes.map((moduleRoute: ModuleRoute) => {
    const auth = resolveAuth(moduleRoute.scope);

    return {
      method: moduleRoute.method as HttpMethod,
      path: `${NOTIFICATION_BASE_PATH}${moduleRoute.path}`,
      ...(auth ? { auth } : {}),
      rateLimit: moduleRoute.method === HTTP_METHOD.GET ? RATE_LIMIT.PANEL_READ : RATE_LIMIT.PANEL_WRITE,
      handler: ({ request }) => handle(request),
    };
  });
}
