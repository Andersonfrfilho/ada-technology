/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { ModuleRoute, ModuleRouteTable } from '@adatechnology/module-http';

import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { AUTH_REQUIREMENT, HTTP_METHOD, type HttpMethod, type Route } from '@/infra/http/router';
import { SCHEDULING_BASE_PATH } from '@/modules/scheduling/scheduling.constant';

const READ_METHODS: readonly string[] = [HTTP_METHOD.GET];

export type BuildSchedulingRoutesParams = {
  readonly moduleRoutes: ModuleRouteTable;
  /** O despachante do modulo, ja montado com resolver de identidade e `basePath`. */
  readonly handle: (request: Request) => Promise<Response>;
};

/**
 * Uma rota da Ada para cada rota do modulo — sem curinga, pelo mesmo motivo do catalogo.
 *
 * Um `/v1/panel/scheduling/*` generico entregaria rate limit, CORS, traceId e checagem de papel de
 * mao beijada ao modulo, e os endpoints sumiriam do inventario de rotas do produto.
 */
export function buildSchedulingRoutes({
  moduleRoutes,
  handle,
}: BuildSchedulingRoutesParams): readonly Route[] {
  return moduleRoutes.map((moduleRoute: ModuleRoute) => ({
    method: moduleRoute.method as HttpMethod,
    path: `${SCHEDULING_BASE_PATH}${moduleRoute.path}`,
    // Quem marca, remarca e bloqueia agenda de outra pessoa e o dono, nao o atendente.
    auth: AUTH_REQUIREMENT.ADMIN,
    rateLimit: READ_METHODS.includes(moduleRoute.method)
      ? RATE_LIMIT.PANEL_READ
      : RATE_LIMIT.PANEL_WRITE,
    handler: ({ request }) => handle(request),
  }));
}
