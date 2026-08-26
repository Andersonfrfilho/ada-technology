/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { checkAvatar, USER_EVENT, type AvatarContentType } from '@adatechnology/user-contracts';
import { AUTH_ROUTE } from '@ada/user-sdk';

const AGENTS_PATH = '/v1/panel/agents';
const CREATED = 201;

import {
  agentAvatarStorage,
  agentRepository,
  refreshTokens,
  sendAgentPasswordReset,
  authenticateAgent,
  createAgent,
  loginAlertNotifier,
  refreshAgentSession,
  signOutAgent,
} from '@/infra/container';
import { logger } from '@/shared/logger';
import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { readJsonBody } from '@/infra/http/requestBody';
import { accepted, jsonData, noContent } from '@/infra/http/responses';
import { AUTH_REQUIREMENT, HTTP_METHOD, requireAgent, type Route } from '@/infra/http/router';
import { consumeAgentResetToken } from '@/modules/agent/agentPasswordReset';
import {
  AgentAvatarForbiddenError,
  AgentAvatarRejectedError,
  AgentAvatarUnavailableError,
  AgentCannotDeactivateSelfError,
  AgentCannotDemoteSelfError,
  AgentResetTokenInvalidError,
  AgentNotAuthenticatedError,
  AgentNotFoundError,
} from '@/modules/agent/agent.error';
import { AGENT_ROLE } from '@/shared/constants/domain.constant';
import {
  agentCreateSchema,
  agentLoginSchema,
  agentResetConfirmSchema,
  agentUpdateSchema,
} from '@/modules/agent/agent.schema';
import type { AgentAdminProfile } from '@/modules/agent/types/agent.types';
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
/**
 * Assina as fotos de uma pagina de uma vez.
 *
 * Falha ao assinar sai como foto ausente, e nao como erro: a listagem de usuarios nao pode virar 500
 * porque o bucket piscou — a tela desenha as iniciais, que e o mesmo que ela faz para quem nunca
 * subiu foto.
 */
async function signAgentAvatars(
  profiles: readonly AgentAdminProfile[],
): Promise<ReadonlyMap<string, string>> {
  const storage = agentAvatarStorage;
  if (!storage) return new Map();

  const keys = [...new Set(profiles.map((profile) => profile.avatarKey).filter((key): key is string => Boolean(key)))];

  const signed = await Promise.all(
    keys.map(async (key) => {
      try {
        return [key, await storage.sign(key)] as const;
      } catch (error) {
        logger.warn({
          message: 'Nao foi possivel assinar a foto de perfil',
          source: 'agent.controller',
          meta: { error: String(error) },
        });
        return undefined;
      }
    }),
  );

  return new Map(signed.filter((entry): entry is readonly [string, string] => entry !== undefined));
}

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
    const avatarUrls = await signAgentAvatars(profiles);

    return jsonData(
      profiles.map(({ id, name, role, email, isActive, avatarKey }) => ({
        id,
        name,
        role,
        email,
        isActive,
        ...(avatarKey && avatarUrls.has(avatarKey) ? { avatarUrl: avatarUrls.get(avatarKey) } : {}),
      })),
    );
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
 * Altera nome, papel e situacao — em qualquer combinacao, e nenhum deles obrigatorio.
 *
 * Desativar e a forma de tirar acesso: nao ha exclusao, porque a conta aparece em trilha de
 * auditoria e em historico de conversa, e apagar deixaria os dois apontando para o vazio.
 */
const updateAgentRoute: Route = {
  method: HTTP_METHOD.PATCH,
  path: `${AGENTS_PATH}/:agentId`,
  auth: AUTH_REQUIREMENT.ADMIN,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async (context) => {
    const { agentId: actorId } = requireAgent(context);
    const targetId = context.params.agentId ?? '';
    const changes = agentUpdateSchema.parse(await readJsonBody(context.request));

    /*
      Duas travas, e as duas sobre a propria conta do administrador.

      Desativar-se tranca o unico admin para fora, e a saida volta a ser SSH no conteiner — o gargalo
      que esta tela existe para eliminar. Rebaixar-se faz o mesmo por outro caminho, e a checagem
      precisa vir antes do banco nos dois casos.
    */
    if (targetId === actorId) {
      if (changes.isActive === false) throw new AgentCannotDeactivateSelfError();
      if (changes.role && changes.role !== AGENT_ROLE.ADMIN) throw new AgentCannotDemoteSelfError();
    }

    const updated = await agentRepository.update(targetId, changes);
    if (!updated) throw new AgentNotFoundError(targetId);

    return jsonData(updated);
  },
};

/**
 * Dispara o e-mail de redefinicao de senha para um usuario.
 *
 * 202, e nao 200: a entrega e assincrona, e a resposta nao promete que a caixa de entrada recebeu.
 */
const sendAgentPasswordResetRoute: Route = {
  method: HTTP_METHOD.POST,
  path: `${AGENTS_PATH}/:agentId/password-reset`,
  auth: AUTH_REQUIREMENT.ADMIN,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async (context) => {
    await sendAgentPasswordReset.execute({ agentId: context.params.agentId ?? '' });

    return accepted();
  },
};

/**
 * Confirma a redefinicao: consome o token do e-mail e grava a senha nova.
 *
 * Publica por necessidade — quem chega aqui nao tem sessao, e o token E a credencial. Dai o teto de
 * tentativas do login: e a rota onde adivinhar em massa compensaria.
 */
const confirmAgentPasswordResetRoute: Route = {
  method: HTTP_METHOD.POST,
  path: `${AGENTS_PATH}/password-reset/confirm`,
  rateLimit: RATE_LIMIT.PANEL_LOGIN,
  handler: async (context) => {
    const { token, password } = agentResetConfirmSchema.parse(await readJsonBody(context.request));

    const agentId = await consumeAgentResetToken(token);
    // Mesma resposta para token inexistente, vencido e ja usado: distinguir diria a quem adivinha
    // que chegou perto.
    if (!agentId) throw new AgentResetTokenInvalidError();

    const updated = await agentRepository.setPasswordHash(agentId, await Bun.password.hash(password));
    if (!updated) throw new AgentResetTokenInvalidError();

    /*
      Todas as sessoes do agente caem junto com a troca.

      Quem redefine senha costuma estar redefinindo porque perdeu o controle da conta; deixar o
      refresh antigo valendo por mais sete dias manteria de pe exatamente o acesso que a troca
      deveria cortar.
    */
    await refreshTokens.revokeAllFor(agentId);

    return noContent();
  },
};

/**
 * Troca a foto de um usuario.
 *
 * `auth: ADMIN` para trocar a de outra pessoa; a propria e liberada abaixo, no proprio handler, e
 * nao por uma segunda rota — o caminho e o mesmo, so a permissao muda.
 *
 * Os bytes chegam crus, com o tipo no `content-type`. Base64 dentro de JSON infla um terco e ainda
 * passaria megabytes por um parse para desfazer em seguida.
 */
const setAgentAvatarRoute: Route = {
  method: HTTP_METHOD.PUT,
  path: `${AGENTS_PATH}/:agentId/avatar`,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async (context) => {
    if (!agentAvatarStorage) throw new AgentAvatarUnavailableError();

    const { agentId: actorId, role } = requireAgent(context);
    const targetId = context.params.agentId ?? '';

    // Trocar a foto de outra pessoa e acao de administracao; a propria, nao.
    if (targetId !== actorId && role !== AGENT_ROLE.ADMIN) throw new AgentAvatarForbiddenError();

    const body = new Uint8Array(await context.request.arrayBuffer());
    const contentType = context.request.headers.get('content-type') ?? '';

    // A regra e do SDK: mesmo teto, mesma lista de tipos, mesma razao para SVG ficar de fora.
    const rejection = checkAvatar({ contentType, byteLength: body.byteLength });
    if (rejection) throw new AgentAvatarRejectedError(rejection);

    const storage = agentAvatarStorage;
    const previousKey = await agentRepository.findAvatarKey(targetId);

    const key = await storage.put({
      userId: targetId,
      body,
      contentType: contentType as AvatarContentType,
    });

    const updated = await agentRepository.setAvatarKey(targetId, key);
    if (!updated) throw new AgentNotFoundError(targetId);

    /*
      A foto antiga sai DEPOIS de a nova estar gravada e apontada.

      Na ordem inversa, uma falha no `put` deixaria a pessoa sem foto nenhuma — e a antiga estava
      boa. A chave carrega o digest do conteudo, entao reenviar a MESMA foto nao cai aqui: a chave
      e a mesma, e nao ha nada a remover.

      Falhar ao remover nao desfaz a troca, que ja deu certo: a nova foto ja e a verdade, e um
      objeto orfao custa centavos. Devolver erro faria a pessoa repetir uma operacao concluida.
    */
    if (previousKey && previousKey !== key) {
      try {
        await storage.remove?.(previousKey);
      } catch (error) {
        logger.warn({
          message: 'Foto de perfil anterior nao removida do bucket',
          source: 'agent.controller',
          meta: { agentId: targetId, error: String(error) },
        });
      }
    }

    return jsonData({ ...updated, avatarUrl: await storage.sign(key) });
  },
};

export const agentRoutes: readonly Route[] = [
  confirmAgentPasswordResetRoute,
  sendAgentPasswordResetRoute,
  setAgentAvatarRoute,
  updateAgentRoute,
  createAgentRoute,
  loginRoute,
  refreshRoute,
  logoutRoute,
  meRoute,
  listAgentsRoute,
];
