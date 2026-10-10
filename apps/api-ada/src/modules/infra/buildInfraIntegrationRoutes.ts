/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { consumeRateLimit as defaultConsumeRateLimit, type RateLimitRule } from '@/infra/http/rateLimit';
import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { readJsonBody } from '@/infra/http/requestBody';
import { jsonData, jsonError } from '@/infra/http/responses';
import {
  AUTH_REQUIREMENT,
  HTTP_METHOD,
  requireAgent,
  type RequestContext,
  type Route,
  type RouteHandler,
} from '@/infra/http/router';
import {
  INFRA_INTEGRATION_PATH,
  INFRA_INTEGRATION_REMOVE_AGENT_BUCKET,
  INFRA_INTEGRATION_SAVE_AGENT_BUCKET,
  INFRA_INTEGRATION_VERIFY_AGENT_BUCKET,
  INFRA_INTEGRATION_VERIFY_PATH,
} from '@/modules/infra/infraRoutes.constant';
import {
  infraIntegrationRemoveBodySchema,
  infraIntegrationSaveBodySchema,
} from '@/modules/infra/infraIntegration.schema';
import type { InfraIntegrationRoutesDependencies } from '@/modules/infra/types/infraIntegrationRoutes.types';
import type { ConsumeRateLimit } from '@/modules/infra/types/infraRoutes.types';
import { ERROR_CODES } from '@/shared/errors/codes';

type AgentRateLimitParams = {
  readonly consume: ConsumeRateLimit;
  readonly bucket: string;
  readonly rule: RateLimitRule;
};

type WithAgentLimitParams = AgentRateLimitParams & {
  readonly handle: (params: { readonly context: RequestContext; readonly agentId: string }) => Promise<Response>;
};

/** O limite por IP roda antes da autenticacao e o IP e forjavel; este so conta quem ja se autenticou. */
function withAgentLimit({ consume, bucket, rule, handle }: WithAgentLimitParams): RouteHandler {
  return async (context) => {
    const { agentId } = requireAgent(context);
    const verdict = await consume({ bucket, identity: agentId, rule });
    if (!verdict.isAllowed) {
      return jsonError({
        code: ERROR_CODES.shared.RATE_LIMITED,
        message: 'Muitas requisicoes',
        statusCode: 429,
        extraHeaders: { 'Retry-After': String(verdict.retryAfterSeconds) },
      });
    }
    return handle({ context, agentId });
  };
}

/** Todas `isNoStore`: o router poe `Cache-Control: no-store` em sucesso e em qualquer erro. */
export function buildInfraIntegrationRoutes(dependencies: InfraIntegrationRoutesDependencies): readonly Route[] {
  const consume = dependencies.consumeRateLimit ?? defaultConsumeRateLimit;
  const common = { auth: AUTH_REQUIREMENT.ADMIN, isNoStore: true } as const;

  const get: Route = {
    ...common,
    method: HTTP_METHOD.GET,
    path: INFRA_INTEGRATION_PATH,
    rateLimit: RATE_LIMIT.PANEL_READ,
    handler: async () => jsonData(await dependencies.getInfraIntegration.execute()),
  };

  const save: Route = {
    ...common,
    method: HTTP_METHOD.PUT,
    path: INFRA_INTEGRATION_PATH,
    rateLimit: RATE_LIMIT.PANEL_INFRA_INTEGRATION_WRITE,
    handler: withAgentLimit({
      consume,
      bucket: INFRA_INTEGRATION_SAVE_AGENT_BUCKET,
      rule: RATE_LIMIT.PANEL_INFRA_INTEGRATION_WRITE,
      handle: async ({ context, agentId }) => {
        const { token, password } = infraIntegrationSaveBodySchema.parse(await readJsonBody(context.request));
        const view = await dependencies.saveInfraIntegration.execute({
          actor: { agentId },
          ipAddress: context.clientAddress,
          token,
          password,
        });
        return jsonData(view);
      },
    }),
  };

  const verify: Route = {
    ...common,
    method: HTTP_METHOD.POST,
    path: INFRA_INTEGRATION_VERIFY_PATH,
    rateLimit: RATE_LIMIT.PANEL_INFRA_INTEGRATION_VERIFY,
    handler: withAgentLimit({
      consume,
      bucket: INFRA_INTEGRATION_VERIFY_AGENT_BUCKET,
      rule: RATE_LIMIT.PANEL_INFRA_INTEGRATION_VERIFY,
      handle: async ({ context, agentId }) =>
        jsonData(await dependencies.verifyInfraIntegration.execute({ actor: { agentId }, ipAddress: context.clientAddress })),
    }),
  };

  const remove: Route = {
    ...common,
    method: HTTP_METHOD.DELETE,
    path: INFRA_INTEGRATION_PATH,
    rateLimit: RATE_LIMIT.PANEL_INFRA_INTEGRATION_WRITE,
    handler: withAgentLimit({
      consume,
      bucket: INFRA_INTEGRATION_REMOVE_AGENT_BUCKET,
      rule: RATE_LIMIT.PANEL_INFRA_INTEGRATION_WRITE,
      handle: async ({ context, agentId }) => {
        const { password } = infraIntegrationRemoveBodySchema.parse(await readJsonBody(context.request));
        const view = await dependencies.removeInfraIntegration.execute({
          actor: { agentId },
          ipAddress: context.clientAddress,
          password,
        });
        return jsonData(view);
      },
    }),
  };

  return [get, save, verify, remove];
}
