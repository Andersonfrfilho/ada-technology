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
import { USER_BASE_PATH } from '@/modules/user/user.constant';

const PASSWORD_RESET_PATH_PREFIX = '/auth/password-reset/';

export type BuildUserRoutesParams = {
  readonly moduleRoutes: ModuleRouteTable;
  /** O despachante do modulo, ja montado com resolver de identidade e `basePath`. */
  readonly handle: (request: Request) => Promise<Response>;
};

/**
 * Ao contrario do catalogo (sempre `admin`), as rotas do `user-module` sao de escopo misto —
 * login e reset de senha sao publicos, perfil e sessao exigem atendente logado.
 */
function resolveAuth(scope: ModuleRoute['scope']): Route['auth'] {
  if (scope === ROUTE_SCOPE.ADMIN) return AUTH_REQUIREMENT.ADMIN;
  if (scope === ROUTE_SCOPE.USER) return AUTH_REQUIREMENT.AGENT;
  return undefined;
}

/** Login e reset de senha sao onde tentar de novo vale para quem ataca — mesmo teto do login do painel. */
function resolveRateLimit(moduleRoute: ModuleRoute) {
  if (moduleRoute.path === '/auth/login' || moduleRoute.path.startsWith(PASSWORD_RESET_PATH_PREFIX)) {
    return RATE_LIMIT.PANEL_LOGIN;
  }
  if (moduleRoute.path === '/auth/refresh') return RATE_LIMIT.PANEL_REFRESH;
  return moduleRoute.method === HTTP_METHOD.GET ? RATE_LIMIT.PANEL_READ : RATE_LIMIT.PANEL_WRITE;
}

/** Uma rota da Ada para cada rota do modulo — sem curinga, mesma razao do `catalogRouteBridge`. */
export function buildUserRoutes({ moduleRoutes, handle }: BuildUserRoutesParams): readonly Route[] {
  return moduleRoutes.map((moduleRoute: ModuleRoute) => {
    const auth = resolveAuth(moduleRoute.scope);

    return {
      method: moduleRoute.method as HttpMethod,
      path: `${USER_BASE_PATH}${moduleRoute.path}`,
      ...(auth ? { auth } : {}),
      rateLimit: resolveRateLimit(moduleRoute),
      handler: ({ request }) => handle(request),
    };
  });
}
