/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { agentRepository, authenticateAgent, refreshAgentSession, signOutAgent } from '@/infra/container';
import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { readJsonBody } from '@/infra/http/requestBody';
import { jsonData, noContent } from '@/infra/http/responses';
import { AUTH_REQUIREMENT, HTTP_METHOD, requireAgent, type Route } from '@/infra/http/router';
import { AgentNotAuthenticatedError, AgentNotFoundError } from '@/modules/agent/agent.error';
import { agentLoginSchema } from '@/modules/agent/agent.schema';
import {
  buildExpiredRefreshCookie,
  buildRefreshCookie,
  readRefreshCookie,
} from '@/modules/agent/refreshCookie';
import type { AgentSessionResult } from '@/modules/agent/types/agent.types';

const LOGIN_PATH = '/v1/auth/login';
const REFRESH_PATH = '/v1/auth/refresh';
const LOGOUT_PATH = '/v1/auth/logout';
const ME_PATH = '/v1/auth/me';

/**
 * O refresh token sai so no cookie, nunca no corpo.
 *
 * Se ele aparecesse no JSON, o painel teria de guarda-lo em algum lugar que o JavaScript alcanca —
 * e ai o `HttpOnly` do cookie nao protegeria mais nada.
 */
function sessionResponse(session: AgentSessionResult): Response {
  const cookie = buildRefreshCookie({
    token: session.refreshToken,
    maxAgeSeconds: session.refreshExpiresInSeconds,
  });

  return jsonData(
    {
      accessToken: session.accessToken,
      expiresInSeconds: session.expiresInSeconds,
      agent: session.agent,
    },
    200,
    { 'Set-Cookie': cookie },
  );
}

const loginRoute: Route = {
  method: HTTP_METHOD.POST,
  path: LOGIN_PATH,
  rateLimit: RATE_LIMIT.PANEL_LOGIN,
  handler: async ({ request, clientAddress }) => {
    const { email, password } = agentLoginSchema.parse(await readJsonBody(request));

    const session = await authenticateAgent.execute({ email, password, ipAddress: clientAddress });

    return sessionResponse(session);
  },
};

const refreshRoute: Route = {
  method: HTTP_METHOD.POST,
  path: REFRESH_PATH,
  rateLimit: RATE_LIMIT.PANEL_REFRESH,
  handler: async ({ request }) => {
    const refreshToken = readRefreshCookie(request);
    if (!refreshToken) throw new AgentNotAuthenticatedError();

    return sessionResponse(await refreshAgentSession.execute(refreshToken));
  },
};

const logoutRoute: Route = {
  method: HTTP_METHOD.POST,
  path: LOGOUT_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async (context) => {
    const { agentId } = requireAgent(context);

    await signOutAgent.execute({
      refreshToken: readRefreshCookie(context.request),
      agentId,
      ipAddress: context.clientAddress,
    });

    return noContent({ 'Set-Cookie': buildExpiredRefreshCookie() });
  },
};

/** Onde o nome e o e-mail vivem: fora do token, atras de autenticacao, e so para o proprio dono. */
const meRoute: Route = {
  method: HTTP_METHOD.GET,
  path: ME_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_READ,
  handler: async (context) => {
    const { agentId } = requireAgent(context);
    const profile = await agentRepository.findById(agentId);

    if (!profile) throw new AgentNotFoundError(agentId);

    return jsonData(profile);
  },
};

export const agentRoutes: readonly Route[] = [loginRoute, refreshRoute, logoutRoute, meRoute];
