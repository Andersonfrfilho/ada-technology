/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { afterEach, beforeAll, describe, expect, it } from 'bun:test';

import { HTTP_METHOD } from '@/modules/shared/http/http.constant';

/**
 * `environment.ts` valida `import.meta.env` no carregamento do modulo, e o `panelHttpClient` o
 * importa. Sem isto o teste falharia na importacao, e nao pelo que ele quer verificar.
 */
process.env.VITE_API_BASE_URL = 'http://localhost:3000';

const originalFetch = globalThis.fetch;

let panelRequest: typeof import('@/modules/shared/http/panelHttpClient').panelRequest;

beforeAll(async () => {
  ({ panelRequest } = await import('@/modules/shared/http/panelHttpClient'));
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function respondWith(response: Response): void {
  globalThis.fetch = Object.assign(async () => response, { preconnect: originalFetch.preconnect });
}

describe('panelRequest', () => {
  /**
   * O caso que quebrou o disparo do e-mail de redefinicao de senha.
   *
   * A rota responde `202` sem corpo — a entrega e assincrona —, e o cliente so tratava `204` como
   * vazio. `json()` sobre corpo vazio estoura com "Unexpected end of JSON input", e a tela mostrava
   * erro de parse no lugar do sucesso.
   */
  it('nao tenta ler JSON de um 202 sem corpo', async () => {
    respondWith(new Response(null, { status: 202 }));

    expect(await panelRequest({ path: '/v1/panel/agents/1/password-reset', method: HTTP_METHOD.POST })).toBeUndefined();
  });

  it('nao tenta ler JSON de um 204 sem corpo', async () => {
    respondWith(new Response(null, { status: 204 }));

    expect(await panelRequest({ path: '/v1/panel/agents/1', method: HTTP_METHOD.DELETE })).toBeUndefined();
  });

  it('devolve o `data` do envelope quando ha corpo', async () => {
    respondWith(Response.json({ data: { id: '1' } }, { status: 200 }));

    expect(await panelRequest<{ readonly id: string }>({ path: '/v1/panel/agents/1' })).toEqual({ id: '1' });
  });
});
