/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { jsonData } from '@/infra/http/responses';
import {
  AUTH_REQUIREMENT,
  createRouter,
  HTTP_METHOD,
  requireAgent,
  type AuthenticateRequest,
  type Route,
} from '@/infra/http/router';
import { AGENT_ROLE } from '@/shared/constants/domain.constant';

const PROTECTED_PATH = '/v1/test/protegida';
const ADMIN_PATH = '/v1/test/admin';

const AGENT = { agentId: 'agente-1', role: AGENT_ROLE.AGENT } as const;
const ADMIN = { agentId: 'admin-1', role: AGENT_ROLE.ADMIN } as const;

const protectedRoute: Route = {
  method: HTTP_METHOD.GET,
  path: PROTECTED_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  handler: (context) => jsonData(requireAgent(context)),
};

const adminRoute: Route = {
  method: HTTP_METHOD.GET,
  path: ADMIN_PATH,
  auth: AUTH_REQUIREMENT.ADMIN,
  handler: (context) => jsonData(requireAgent(context)),
};

const ROUTES: readonly Route[] = [protectedRoute, adminRoute];

function buildRouter(identity: typeof AGENT | typeof ADMIN | undefined) {
  const authenticate: AuthenticateRequest = async () => identity;

  return createRouter({ routes: ROUTES, authenticate });
}

function get(path: string): Request {
  return new Request(`https://api.ada.test${path}`);
}

describe('createRouter com rota protegida', () => {
  it('entrega o atendente autenticado ao handler', async () => {
    const response = await buildRouter(AGENT)(get(PROTECTED_PATH));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: AGENT });
  });

  it('recusa com 401 quando ninguem se identifica', async () => {
    const response = await buildRouter(undefined)(get(PROTECTED_PATH));

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe('AGENT_NOT_AUTHENTICATED');
  });

  it('recusa com 403 quem esta autenticado sem ser administrador', async () => {
    const response = await buildRouter(AGENT)(get(ADMIN_PATH));

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe('AGENT_NOT_AUTHORIZED');
  });

  it('deixa o administrador passar pela rota restrita', async () => {
    expect((await buildRouter(ADMIN)(get(ADMIN_PATH))).status).toBe(200);
  });

  it('nao sobe com rota protegida sem quem autentique', () => {
    expect(() => createRouter({ routes: ROUTES })).toThrow();
  });
});
