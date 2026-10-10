/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { afterEach, describe, expect, it, spyOn } from 'bun:test';

import { environment } from '@/infra/config/environment';
import { agentRepository, refreshTokens } from '@/infra/container';
import { createRouter, type Route } from '@/infra/http/router';
import { agentRoutes } from '@/modules/agent/agent.controller';
import { AGENT_ROLE } from '@/shared/constants/domain.constant';

const REFRESH_URL = 'https://api.ada.test/v1/auth/refresh';
const COOKIE = 'ada_refresh=valid-refresh-token';
const PANEL_ORIGIN = environment.CORS_ALLOWED_ORIGINS[0] ?? '';

const AGENT = { id: 'agent-1', email: 'a@ada.test', name: 'Ana', role: AGENT_ROLE.AGENT } as const;

function buildRefreshRouter() {
  const refresh = agentRoutes.find((route) => route.path === '/v1/auth/refresh');
  if (!refresh) throw new Error('rota de refresh ausente');
  const { rateLimit: _rateLimit, ...routeWithoutRateLimit } = refresh;
  const routes: readonly Route[] = [routeWithoutRateLimit];

  return createRouter({ routes });
}

function refreshRequest(origin: string | undefined): Request {
  const headers: Record<string, string> = { cookie: COOKIE };
  if (origin) headers.origin = origin;

  return new Request(REFRESH_URL, { method: 'POST', headers });
}

function stubValidSession(): void {
  spyOn(refreshTokens, 'rotate').mockResolvedValue({
    token: 'rotated-token',
    expiresInSeconds: 604_800,
    agentId: AGENT.id,
  });
  spyOn(agentRepository, 'findById').mockResolvedValue(AGENT);
}

afterEach(() => {
  spyOn(refreshTokens, 'rotate').mockRestore();
  spyOn(agentRepository, 'findById').mockRestore();
});

describe('POST /v1/auth/refresh', () => {
  it('com cookie valido e Origin do painel devolve a sessao', async () => {
    stubValidSession();

    const response = await buildRefreshRouter()(refreshRequest(PANEL_ORIGIN));
    const body = (await response.json()) as { data: { accessToken: string; agent: { id: string } } };

    expect(response.status).toBe(200);
    expect(body.data.accessToken.length).toBeGreaterThan(0);
    expect(body.data.agent.id).toBe(AGENT.id);
    expect(response.headers.get('set-cookie')).toContain('ada_refresh=rotated-token');
  });

  it('com Origin fora do painel recusa mesmo com cookie valido', async () => {
    stubValidSession();

    const response = await buildRefreshRouter()(refreshRequest('https://site.cliente.test'));
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AGENT_NOT_AUTHENTICATED');
    expect(refreshTokens.rotate).not.toHaveBeenCalled();
  });

  it('sem Origin recusa mesmo com cookie valido', async () => {
    stubValidSession();

    const response = await buildRefreshRouter()(refreshRequest(undefined));
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AGENT_NOT_AUTHENTICATED');
    expect(refreshTokens.rotate).not.toHaveBeenCalled();
  });
});
