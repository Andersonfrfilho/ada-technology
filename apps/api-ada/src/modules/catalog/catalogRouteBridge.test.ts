/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, test } from 'bun:test';

import type { ModuleRouteTable } from '@adatechnology/module-http';

import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { AUTH_REQUIREMENT } from '@/infra/http/router';
import { CATALOG_BASE_PATH } from '@/modules/catalog/catalog.constant';
import { buildCatalogRoutes } from '@/modules/catalog/catalogRouteBridge';

const moduleRoutes = [
  { method: 'GET', path: '/products', scope: 'admin', handler: async () => ({ kind: 'empty', status: 204 }) },
  { method: 'PUT', path: '/products/:id', scope: 'admin', handler: async () => ({ kind: 'empty', status: 204 }) },
] as unknown as ModuleRouteTable;

function build(handle: (request: Request) => Promise<Response> = async () => new Response(null)) {
  return buildCatalogRoutes({ moduleRoutes, handle });
}

describe('buildCatalogRoutes', () => {
  test('declara uma rota da Ada para cada rota do modulo, com o prefixo do painel', () => {
    expect(build().map((route) => `${route.method} ${route.path}`)).toEqual([
      `GET ${CATALOG_BASE_PATH}/products`,
      `PUT ${CATALOG_BASE_PATH}/products/:id`,
    ]);
  });

  test('exige administrador em toda rota, inclusive nas de leitura', () => {
    // O `scope: 'admin'` do modulo nao recusa sozinho: sem `requiredScopes` ele aceita qualquer
    // identidade valida, e o atendente comum entraria no catalogo.
    expect(build().every((route) => route.auth === AUTH_REQUIREMENT.ADMIN)).toBe(true);
  });

  test('separa o teto de leitura do de escrita', () => {
    const [read, write] = build();

    expect(read?.rateLimit).toBe(RATE_LIMIT.PANEL_READ);
    expect(write?.rateLimit).toBe(RATE_LIMIT.PANEL_WRITE);
  });

  test('delega a requisicao original ao despachante do modulo', async () => {
    const seen: Request[] = [];
    const routes = build(async (request) => {
      seen.push(request);
      return new Response('ok');
    });

    const request = new Request(`https://api.local${CATALOG_BASE_PATH}/products`);
    const response = await routes[0]?.handler({
      request,
      url: new URL(request.url),
      params: {},
      traceId: 'trace',
      clientAddress: '127.0.0.1',
    });

    expect(seen[0]).toBe(request);
    expect(await response?.text()).toBe('ok');
  });
});
