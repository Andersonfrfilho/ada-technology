/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { createCatalogRoutes } from '@adatechnology/catalog-module';
import { createModuleFetchRouter } from '@adatechnology/catalog-module/http/fetch';

import { catalogMetaSync, catalogModule } from '@/infra/container';
import type { Route } from '@/infra/http/router';
import { CATALOG_BASE_PATH, CATALOG_META_SYNC } from '@/modules/catalog/catalog.constant';
import { catalogAuthResolver } from '@/modules/catalog/catalogAuthResolver';
import { buildCatalogRoutes } from '@/modules/catalog/catalogRouteBridge';

// Espelha o `metaSync` da config do modulo: sem ele as rotas de publicacao nao sao montadas, e o
// painel nao mostra botao de publicar numa instalacao que nao tem para onde publicar.
const moduleRoutes = createCatalogRoutes({
  module: catalogModule,
  ...(catalogMetaSync ? { metaSync: CATALOG_META_SYNC } : {}),
});

const moduleRouter = createModuleFetchRouter({
  routes: moduleRoutes,
  basePath: CATALOG_BASE_PATH,
  authResolver: catalogAuthResolver,
});

export const catalogRoutes: readonly Route[] = buildCatalogRoutes({
  moduleRoutes,
  handle: (request) => moduleRouter.handle(request),
});
