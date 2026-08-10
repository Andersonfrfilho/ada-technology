/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { ERROR_CODES } from '@/shared/errors/codes';
import { resolveClientAddress } from '@/infra/http/clientAddress';
import { consumeRateLimit, type RateLimitRule } from '@/infra/http/rateLimit';
import { jsonError } from '@/infra/http/responses';
import { handleUncaughtError } from '@/infra/http/exceptionFilter';
import { resolveCorsHeaders } from '@/infra/http/cors';
import { createTraceId } from '@/shared/id';
import { AGENT_ROLE } from '@/shared/constants/domain.constant';
import type { AuthenticatedAgent } from '@/modules/agent/types/agent.types';

export const HTTP_METHOD = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;

export type HttpMethod = (typeof HTTP_METHOD)[keyof typeof HTTP_METHOD];

export const AUTH_REQUIREMENT = {
  AGENT: 'agent',
  ADMIN: 'admin',
} as const;
export type AuthRequirement = (typeof AUTH_REQUIREMENT)[keyof typeof AUTH_REQUIREMENT];

/**
 * Como o router descobre quem esta chamando.
 *
 * Injetada na composicao, e nao importada aqui: a camada de transporte nao precisa saber o que e
 * um atendente, so precisa de alguem que saiba responder pela requisicao.
 */
export type AuthenticateRequest = (request: Request) => Promise<AuthenticatedAgent | undefined>;

export type RequestContext = {
  readonly request: Request;
  readonly url: URL;
  readonly params: Readonly<Record<string, string>>;
  readonly traceId: string;
  /** Ja resolvido atras do proxy: o handler nunca precisa reler `X-Forwarded-For` por conta propria. */
  readonly clientAddress: string;
  /** Presente so em rota que declara `auth`; use `requireAgent` para consumir sem checagem solta. */
  readonly agent?: AuthenticatedAgent;
};

export type RouteHandler = (context: RequestContext) => Promise<Response> | Response;

/** So o que o router usa do `Bun.Server`, para nao amarrar o modulo ao tipo generico do runtime. */
export type ClientAddressResolver = {
  requestIP(request: Request): { readonly address: string } | null;
};

export type Route = {
  readonly method: HttpMethod;
  readonly path: string;
  readonly handler: RouteHandler;
  /** Sem regra a rota nao e limitada; toda rota publica declara a sua. */
  readonly rateLimit?: RateLimitRule;
  /** Sem `auth` a rota e publica — o painel declara `agent`, e o que so o dono configura, `admin`. */
  readonly auth?: AuthRequirement;
};

type CompiledRoute = Route & {
  readonly pattern: RegExp;
  readonly paramNames: readonly string[];
};

function compileRoute(route: Route): CompiledRoute {
  const paramNames: string[] = [];

  const source = route.path
    .split('/')
    .map((segment) => {
      if (!segment.startsWith(':')) return escapeLiteral(segment);
      paramNames.push(segment.slice(1));
      return '([^/]+)';
    })
    .join('/');

  return { ...route, pattern: new RegExp(`^${source}$`), paramNames };
}

function escapeLiteral(segment: string): string {
  return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type CreateRouterParams = {
  readonly routes: readonly Route[];
  readonly authenticate?: AuthenticateRequest;
};

export function createRouter({ routes, authenticate }: CreateRouterParams) {
  const compiled = routes.map(compileRoute);

  // Rota protegida sem quem autentique passaria despercebida ate alguem chamar sem token e entrar.
  if (compiled.some((route) => route.auth) && !authenticate) {
    throw new Error('Rota com `auth` declarada sem `authenticate` no router');
  }

  return async function handleRequest(request: Request, server?: ClientAddressResolver): Promise<Response> {
    const traceId = request.headers.get('x-trace-id') ?? createTraceId();
    const url = new URL(request.url);
    const corsHeaders = resolveCorsHeaders(request);
    const clientAddress = resolveClientAddress({
      request,
      socketAddress: server?.requestIP(request)?.address,
    });

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    for (const route of compiled) {
      if (route.method !== request.method) continue;

      const match = route.pattern.exec(url.pathname);
      if (!match) continue;

      const params: Record<string, string> = {};
      route.paramNames.forEach((name, index) => {
        params[name] = decodeURIComponent(match[index + 1] ?? '');
      });

      try {
        const denial = await denyByRateLimit({ route, identity: clientAddress });
        if (denial) return withHeaders(denial, corsHeaders, traceId);

        const authorization = await authorizeRoute({ request, route, authenticate });
        if (authorization.denial) return withHeaders(authorization.denial, corsHeaders, traceId);

        const agent = authorization.agent;
        const response = await route.handler({
          request,
          url,
          params,
          traceId,
          clientAddress,
          ...(agent ? { agent } : {}),
        });
        return withHeaders(response, corsHeaders, traceId);
      } catch (error) {
        // Use case nao faz try/catch: todo erro chega aqui, e so aqui vira resposta.
        return withHeaders(handleUncaughtError({ error, traceId, path: url.pathname }), corsHeaders, traceId);
      }
    }

    return withHeaders(
      jsonError({
        code: ERROR_CODES.shared.ROUTE_NOT_FOUND,
        message: 'Rota nao encontrada',
        statusCode: 404,
      }),
      corsHeaders,
      traceId,
    );
  };
}

type DenyByRateLimitParams = {
  readonly route: CompiledRoute;
  readonly identity: string;
};

/** Devolve a resposta de recusa, ou `undefined` quando a requisicao pode seguir. */
async function denyByRateLimit({ route, identity }: DenyByRateLimitParams): Promise<Response | undefined> {
  if (!route.rateLimit) return undefined;

  const verdict = await consumeRateLimit({
    bucket: `${route.method}:${route.path}`,
    identity,
    rule: route.rateLimit,
  });

  if (verdict.isAllowed) return undefined;

  return jsonError({
    code: ERROR_CODES.shared.RATE_LIMITED,
    message: 'Muitas requisicoes',
    statusCode: 429,
    extraHeaders: { 'Retry-After': String(verdict.retryAfterSeconds) },
  });
}

type AuthorizeRouteParams = {
  readonly request: Request;
  readonly route: CompiledRoute;
  readonly authenticate: AuthenticateRequest | undefined;
};

type AuthorizeRouteResult = {
  readonly denial?: Response;
  readonly agent?: AuthenticatedAgent;
};

/**
 * Recusa antes do handler, com a mesma resposta para token ausente, expirado ou adulterado.
 *
 * A checagem de papel aqui e a porta, nao o cadeado: rota que mexe em recurso de terceiro ainda
 * confere o dono dentro do use case, porque papel de administrador nao diz de quem e o registro.
 */
async function authorizeRoute({
  request,
  route,
  authenticate,
}: AuthorizeRouteParams): Promise<AuthorizeRouteResult> {
  if (!route.auth || !authenticate) return {};

  const agent = await authenticate(request);

  if (!agent) {
    return {
      denial: jsonError({
        code: ERROR_CODES.agent.NOT_AUTHENTICATED,
        message: 'Autenticacao necessaria',
        statusCode: 401,
      }),
    };
  }

  if (route.auth === AUTH_REQUIREMENT.ADMIN && agent.role !== AGENT_ROLE.ADMIN) {
    return {
      denial: jsonError({
        code: ERROR_CODES.agent.NOT_AUTHORIZED,
        message: 'Acesso negado',
        statusCode: 403,
      }),
    };
  }

  return { agent };
}

/**
 * Le o atendente que o router ja autenticou.
 *
 * Existe para que o controller nao trate `undefined` de um campo que a rota protegida sempre tem —
 * e para que a falta dele apareca como erro, em vez de virar uma consulta sem dono.
 */
export function requireAgent(context: RequestContext): AuthenticatedAgent {
  if (!context.agent) throw new Error('Rota sem `auth` declarada consumiu o atendente autenticado');
  return context.agent;
}

function withHeaders(response: Response, corsHeaders: Headers, traceId: string): Response {
  const headers = new Headers(response.headers);
  corsHeaders.forEach((value, key) => headers.set(key, value));
  headers.set('X-Trace-Id', traceId);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
