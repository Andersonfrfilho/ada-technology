/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { AUTH_ROUTE } from '@ada/user-sdk';

const AGENTS_PATH = '/v1/panel/agents';

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
  buildRememberCookie,
  readRememberCookie,
  readRefreshCookie,
} from '@/modules/agent/refreshCookie';
import type { AgentSessionResult } from '@/modules/agent/types/agent.types';

/**
 * O refresh token sai so no cookie, nunca no corpo.
 *
 * Se ele aparecesse no JSON, o painel teria de guarda-lo em algum lugar que o JavaScript alcanca —
 * e ai o `HttpOnly` do cookie nao protegeria mais nada.
 */
function sessionResponse(session: AgentSessionResult, rememberMe: boolean): Response {
  // Sem `Max-Age` o cookie morre com a janela; com ele, sobrevive. O companheiro `ada_remember`
  // guarda a escolha para a renovacao reemitir a MESMA politica — o navegador manda o valor do
  // cookie, nunca o prazo dele.
  const maxAgeSeconds = rememberMe ? session.refreshExpiresInSeconds : undefined;

  const cookie = buildRefreshCookie({
    token: session.refreshToken,
    ...(maxAgeSeconds === undefined ? {} : { maxAgeSeconds }),
  });

  const response = jsonData({
    accessToken: session.accessToken,
    expiresInSeconds: session.expiresInSeconds,
    agent: session.agent,
  });

  // `append` e nao um objeto de cabecalhos: sao DOIS `Set-Cookie`, e um `Record<string, string>`
  // so guarda um valor por chave — o segundo apagaria o primeiro.
  response.headers.append('Set-Cookie', cookie);
  response.headers.append('Set-Cookie', buildRememberCookie(maxAgeSeconds));

  return response;
}

const loginRoute: Route = {
  method: HTTP_METHOD.POST,
  path: AUTH_ROUTE.LOGIN,
  rateLimit: RATE_LIMIT.PANEL_LOGIN,
  handler: async ({ request, clientAddress }) => {
    const { email, password, rememberMe } = agentLoginSchema.parse(await readJsonBody(request));

    const session = await authenticateAgent.execute({ email, password, ipAddress: clientAddress });

    return sessionResponse(session, rememberMe);
  },
};

const refreshRoute: Route = {
  method: HTTP_METHOD.POST,
  path: AUTH_ROUTE.REFRESH,
  rateLimit: RATE_LIMIT.PANEL_REFRESH,
  handler: async ({ request }) => {
    const refreshToken = readRefreshCookie(request);
    if (!refreshToken) throw new AgentNotAuthenticatedError();

    // A renovacao herda a escolha do login em vez de assumir uma: sem isto, um login de maquina
    // emprestada viraria sessao de sete dias na primeira renovacao, em silencio.
    return sessionResponse(await refreshAgentSession.execute(refreshToken), readRememberCookie(request));
  },
};

const logoutRoute: Route = {
  method: HTTP_METHOD.POST,
  path: AUTH_ROUTE.LOGOUT,
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
  path: AUTH_ROUTE.ME,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_READ,
  handler: async (context) => {
    const { agentId } = requireAgent(context);
    const profile = await agentRepository.findById(agentId);

    if (!profile) throw new AgentNotFoundError(agentId);

    return jsonData(profile);
  },
};

/** A lista que a agenda usa para montar a grade: id e nome, sem conta nem sessao de ninguem. */
const listAgentsRoute: Route = {
  method: HTTP_METHOD.GET,
  path: AGENTS_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_READ,
  handler: async () => {
    const profiles = await agentRepository.listActive();

    return jsonData(profiles.map(({ id, name, role }) => ({ id, name, role })));
  },
};

export const agentRoutes: readonly Route[] = [
  loginRoute,
  refreshRoute,
  logoutRoute,
  meRoute,
  listAgentsRoute,
];
