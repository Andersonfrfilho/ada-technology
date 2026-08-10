/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import {
  buildExpiredRefreshCookie,
  buildRefreshCookie,
  readRefreshCookie,
} from '@/modules/agent/refreshCookie';

const URL_UNDER_TEST = 'https://api.ada.test/v1/auth/refresh';

function buildRequest(cookie?: string): Request {
  return new Request(URL_UNDER_TEST, { headers: cookie ? { cookie } : {} });
}

describe('buildRefreshCookie', () => {
  it('mantem o token fora do alcance do JavaScript e restrito as rotas de sessao', () => {
    const cookie = buildRefreshCookie({ token: 'abc123', maxAgeSeconds: 604_800 });

    expect(cookie).toContain('ada_refresh=abc123');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/v1/auth');
    expect(cookie).toContain('Max-Age=604800');
    expect(cookie).toContain('SameSite=');
  });

  it('expira o cookie no logout em vez de deixar o valor antigo no navegador', () => {
    expect(buildExpiredRefreshCookie()).toContain('Max-Age=0');
  });
});

describe('readRefreshCookie', () => {
  it('acha o token entre outros cookies do dominio', () => {
    const request = buildRequest('theme=dark; ada_refresh=token-valido; locale=pt-BR');

    expect(readRefreshCookie(request)).toBe('token-valido');
  });

  it('devolve indefinido sem cabecalho de cookie', () => {
    expect(readRefreshCookie(buildRequest())).toBeUndefined();
  });

  it('ignora o cookie ja expirado, que chega com valor vazio', () => {
    expect(readRefreshCookie(buildRequest('ada_refresh='))).toBeUndefined();
  });

  it('nao confunde cookie de nome parecido', () => {
    expect(readRefreshCookie(buildRequest('outro_ada_refresh=intruso'))).toBeUndefined();
  });
});
