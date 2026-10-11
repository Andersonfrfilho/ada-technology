/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { afterEach, describe, expect, it, spyOn } from 'bun:test';

import { environment } from '@/infra/config/environment';
import { startWidgetSession } from '@/infra/container';
import { resolveCorsHeaders } from '@/infra/http/cors';
import { createRouter, type Route } from '@/infra/http/router';
import { widgetRoutes } from '@/modules/channel/widget/widget.controller';

const API = 'https://api.ada.test';
const SESSIONS_PATH = '/v1/widget/sessions';
const UNKNOWN_ORIGIN = 'https://desconhecido.example';

const PANEL_ORIGIN = environment.CORS_ALLOWED_ORIGINS[0] ?? '';
const WIDGET_ORIGIN = environment.WIDGET_ALLOWED_ORIGINS[0] ?? '';

function preflight(origin: string): Request {
  return new Request(`${API}${SESSIONS_PATH}`, {
    method: 'OPTIONS',
    headers: { origin, 'access-control-request-method': 'POST' },
  });
}

function simple(origin: string): Request {
  return new Request(`${API}/v1/health`, { headers: { origin } });
}

describe('CORS do painel (nao regressao)', () => {
  it('preflight devolve a origem e as credenciais', () => {
    const headers = resolveCorsHeaders(preflight(PANEL_ORIGIN));

    expect(headers.get('access-control-allow-origin')).toBe(PANEL_ORIGIN);
    expect(headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('requisicao simples devolve a origem e as credenciais', () => {
    const headers = resolveCorsHeaders(simple(PANEL_ORIGIN));

    expect(headers.get('access-control-allow-origin')).toBe(PANEL_ORIGIN);
    expect(headers.get('access-control-allow-credentials')).toBe('true');
  });
});

describe('CORS do widget (nao regressao)', () => {
  it('devolve origem, metodos e o cabecalho X-Widget-Session', () => {
    const headers = resolveCorsHeaders(preflight(WIDGET_ORIGIN));

    expect(headers.get('access-control-allow-origin')).toBe(WIDGET_ORIGIN);
    expect(headers.get('access-control-allow-methods')).toContain('POST');
    expect(headers.get('access-control-allow-headers')).toContain('X-Widget-Session');
  });
});

describe('CORS de origem desconhecida (nao regressao)', () => {
  it('nao recebe nenhum cabecalho de CORS', () => {
    const headers = resolveCorsHeaders(preflight(UNKNOWN_ORIGIN));

    expect([...headers.keys()]).toEqual([]);
  });
});

describe('rota publica do widget (nao regressao)', () => {
  afterEach(() => {
    spyOn(startWidgetSession, 'execute').mockRestore();
  });

  it('abre sessao com a Origin do widget e sem credenciais', async () => {
    spyOn(startWidgetSession, 'execute').mockResolvedValue({ sessionId: 'widget-test-session' });
    const createSession = widgetRoutes.find((route) => route.path === SESSIONS_PATH);
    if (!createSession) throw new Error('rota do widget ausente');
    const { rateLimit: _rateLimit, ...routeWithoutRateLimit } = createSession;
    const routes: readonly Route[] = [routeWithoutRateLimit];

    const response = await createRouter({ routes })(
      new Request(`${API}${SESSIONS_PATH}`, { method: 'POST', headers: { origin: WIDGET_ORIGIN } }),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get('access-control-allow-origin')).toBe(WIDGET_ORIGIN);
    expect(await response.json()).toEqual({ data: { sessionId: 'widget-test-session' } });
  });
});
