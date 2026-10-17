/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { INFRA_ADMIN_SCOPE } from '@adatechnology/infra-contracts';
import type { InfraModuleRoute } from '@adatechnology/infra-module';
import type { HttpResult } from '@adatechnology/module-http';

import { readJsonBody } from '@/infra/http/requestBody';
import { jsonData, jsonError } from '@/infra/http/responses';
import { AUTH_REQUIREMENT, requireAgent, type Route } from '@/infra/http/router';
import { RATE_LIMIT_RULE_BY_PROFILE } from '@/modules/infra/buildInfraRateLimiter';

const PANEL_BASE_PATH = '/v1/panel';
const PANEL_COMPANY_ID = 'panel';

type ErrorBody = { readonly error: { readonly code: string; readonly message: string } };

function toResponse(result: HttpResult): Response {
  if (result.kind !== 'json') throw new Error(`Resultado HTTP sem suporte nas rotas de infra: ${result.kind}`);

  const body = result.body as { readonly data: unknown } | ErrorBody;
  if ('data' in body) return jsonData(body.data, result.status, { ...result.headers });

  return jsonError({
    code: body.error.code,
    message: body.error.message,
    statusCode: result.status,
    ...(result.headers ? { extraHeaders: { ...result.headers } } : {}),
  });
}

/** Traduz a tabela do módulo para o router do produto: autenticação, limite por IP e erros continuam dele. */
export function adaptInfraRoutes(routes: readonly InfraModuleRoute[]): readonly Route[] {
  return routes.map((route) => ({
    method: route.method,
    path: `${PANEL_BASE_PATH}${route.path}`,
    auth: AUTH_REQUIREMENT.ADMIN,
    rateLimit: RATE_LIMIT_RULE_BY_PROFILE[route.rateLimitProfile],
    isNoStore: route.isNoStore,
    handler: async (context) => {
      const { agentId } = requireAgent(context);
      const body = route.bodySchema ? await readJsonBody(context.request) : undefined;
      const result = await route.handler({
        params: context.params,
        query: {},
        body,
        headers: {},
        auth: { companyId: PANEL_COMPANY_ID, userId: agentId, scopes: [INFRA_ADMIN_SCOPE] },
        ip: context.clientAddress,
      });

      return toResponse(result);
    },
  }));
}
