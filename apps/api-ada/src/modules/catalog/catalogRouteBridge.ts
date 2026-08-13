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
import { CATALOG_BASE_PATH } from '@/modules/catalog/catalog.constant';

/** Leitura tem teto proprio porque a listagem e paginada e a tela recarrega a cada filtro. */
const READ_METHODS: readonly string[] = [HTTP_METHOD.GET];

export type BuildCatalogRoutesParams = {
  readonly moduleRoutes: ModuleRouteTable;
  /** O despachante do modulo, ja montado com resolver de identidade e `basePath`. */
  readonly handle: (request: Request) => Promise<Response>;
};

/**
 * Uma rota da Ada para cada rota do modulo — sem curinga.
 *
 * Um `/v1/panel/catalog/*` generico entregaria rate limit, CORS, traceId e checagem de papel de
 * mao beijada ao modulo, e os endpoints sumiriam do inventario de rotas do produto. Declarar a
 * partir da tabela publicada mantem as duas listas em sincronia sem ninguem copiar caminho a mao.
 */
export function buildCatalogRoutes({ moduleRoutes, handle }: BuildCatalogRoutesParams): readonly Route[] {
  return moduleRoutes.map((moduleRoute: ModuleRoute) => ({
    method: moduleRoute.method as HttpMethod,
    path: `${CATALOG_BASE_PATH}${moduleRoute.path}`,
    // Preco e estoque sao configuracao do dono, nao trabalho de atendente. O `scope: 'admin'` do
    // modulo nao basta: sem `requiredScopes` o despachante aceita qualquer identidade valida.
    auth: AUTH_REQUIREMENT.ADMIN,
    rateLimit: READ_METHODS.includes(moduleRoute.method) ? RATE_LIMIT.PANEL_READ : RATE_LIMIT.PANEL_WRITE,
    handler: ({ request }) => handle(request),
  }));
}
