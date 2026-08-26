/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { USER_EVENT } from '@adatechnology/user-contracts';
import { AUTH_ROUTE } from '@ada/user-sdk';

const AGENTS_PATH = '/v1/panel/agents';
const CREATED = 201;

import {
  agentRepository,
  authenticateAgent,
  createAgent,
  loginAlertNotifier,
  refreshAgentSession,
  signOutAgent,
} from '@/infra/container';
import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { readJsonBody } from '@/infra/http/requestBody';
import { jsonData, noContent } from '@/infra/http/responses';
import { AUTH_REQUIREMENT, HTTP_METHOD, requireAgent, type Route } from '@/infra/http/router';
import {
  AgentCannotDeactivateSelfError,
  AgentNotAuthenticatedError,
  AgentNotFoundError,
} from '@/modules/agent/agent.error';
import { AGENT_ROLE } from '@/shared/constants/domain.constant';
import { agentCreateSchema, agentLoginSchema, agentSetActiveSchema } from '@/modules/agent/agent.schema';
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

/**
 * A lista de atendentes, com DUAS formas conforme quem pergunta.
 *
 * Para a agenda montar a grade bastam id, nome e papel — e era so isso que saia daqui, de proposito:
 * uma tela de escala nao precisa do e-mail de ninguem.
 *
 * Quem administra a equipe precisa: sem o e-mail, a tela lista pessoas que ninguem consegue
 * distinguir quando ha dois "Ana". Entao o campo entra so para `admin`, que e quem alcanca o
 * cadastro. Um endpoint separado diria a mesma coisa com o dobro de superficie.
 */
const listAgentsRoute: Route = {
  method: HTTP_METHOD.GET,
  path: AGENTS_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_READ,
  handler: async ({ agent }) => {
    const isAdmin = agent?.role === AGENT_ROLE.ADMIN;

    /**
     * Admin ve TODOS, inclusive desativados — sem isso nao ha como reativar ninguem. Quem nao e
     * admin ve so os ativos, porque a lista dele serve a agenda: oferecer titular desativado seria
     * marcar horario com quem nao entra mais.
     */
    if (!isAdmin) {
      const active = await agentRepository.listActive();
      return jsonData(active.map(({ id, name, role }) => ({ id, name, role })));
    }

    const profiles = await agentRepository.listAll();

    return jsonData(profiles.map(({ id, name, role, email, isActive }) => ({ id, name, role, email, isActive })));
  },
};

/**
 * Cadastra um atendente pelo painel.
 *
 * `auth: ADMIN` — criar quem entra no produto e a acao mais privilegiada que existe, e ela nao pode
 * depender de acesso SSH ao conteiner, que era a unica forma ate aqui (o seed).
 *
 * 201 com o perfil, sem senha nem hash: o corpo da resposta volta para a tela, e nada que identifique
 * credencial atravessa esse caminho.
 */
const createAgentRoute: Route = {
  method: HTTP_METHOD.POST,
  path: AGENTS_PATH,
  auth: AUTH_REQUIREMENT.ADMIN,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async ({ request }) => {
    const input = agentCreateSchema.parse(await readJsonBody(request));

    const created = await createAgent.execute(input);

    return jsonData({ id: created.id, email: created.email, name: created.name, role: created.role }, CREATED);
  },
};

/**
 * Ativa ou desativa. Desativar e a forma de tirar acesso: nao ha exclusao, porque a conta aparece em
 * trilha de auditoria e em historico de conversa, e apagar deixaria os dois apontando para o vazio.
 */
const setAgentActiveRoute: Route = {
  method: HTTP_METHOD.PATCH,
  path: `${AGENTS_PATH}/:agentId`,
  auth: AUTH_REQUIREMENT.ADMIN,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async (context) => {
    const { agentId: actorId } = requireAgent(context);
    const targetId = context.params.agentId ?? '';
    const { isActive } = agentSetActiveSchema.parse(await readJsonBody(context.request));

    // Antes de tocar no banco: um admin sozinho se trancaria para fora, e a saida voltaria a ser SSH.
    if (!isActive && targetId === actorId) throw new AgentCannotDeactivateSelfError();

    const updated = await agentRepository.setActive(targetId, isActive);
    if (!updated) throw new AgentNotFoundError(targetId);

    return jsonData(updated);
  },
};

export const agentRoutes: readonly Route[] = [
  setAgentActiveRoute,
  createAgentRoute,
  loginRoute,
  refreshRoute,
  logoutRoute,
  meRoute,
  listAgentsRoute,
];
