/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { jsonData, jsonError } from '@/infra/http/responses';
import { requireAgent, type RequestContext } from '@/infra/http/router';
import { ACTOR_TYPE } from '@/modules/audit/audit.constant';
import { INFRA_OPERATION_TRIGGER } from '@/modules/infra/infra.constant';
import { infraEnvironmentParamsSchema, infraPowerOnBodySchema } from '@/modules/infra/infra.schema';
import type { ConsumeRateLimit, InfraPowerUseCase } from '@/modules/infra/types/infraRoutes.types';
import { ERROR_CODES } from '@/shared/errors/codes';

type BuildInfraPowerHandlerParams = {
  readonly useCase: InfraPowerUseCase;
  readonly agentBucket: string;
  readonly consumeRateLimit: ConsumeRateLimit;
  readonly isKeepOnUntilAccepted?: boolean;
};

export function buildInfraPowerHandler(params: BuildInfraPowerHandlerParams) {
  const { useCase, agentBucket, consumeRateLimit: consume, isKeepOnUntilAccepted } = params;

  return async (context: RequestContext): Promise<Response> => {
    const { environmentId } = infraEnvironmentParamsSchema.parse(context.params);
    const { agentId } = requireAgent(context);
    // O limite por IP roda antes da autenticação e o IP é forjável; este só conta quem já se autenticou.
    const verdict = await consume({
      bucket: agentBucket,
      identity: agentId,
      rule: RATE_LIMIT.PANEL_INFRA_POWER_PER_AGENT,
    });
    if (!verdict.isAllowed) {
      return jsonError({
        code: ERROR_CODES.shared.RATE_LIMITED,
        message: 'Muitas requisicoes',
        statusCode: 429,
        extraHeaders: { 'Retry-After': String(verdict.retryAfterSeconds) },
      });
    }
    const { keepOnUntil } = isKeepOnUntilAccepted
      ? infraPowerOnBodySchema.parse(await context.request.json().catch(() => ({})))
      : { keepOnUntil: undefined };

    const result = await useCase.execute({
      environmentId,
      actor: { type: ACTOR_TYPE.AGENT, agentId },
      trigger: INFRA_OPERATION_TRIGGER.MANUAL,
      ipAddress: context.clientAddress,
      ...(keepOnUntil ? { keepOnUntil: new Date(keepOnUntil) } : {}),
    });

    return jsonData({ operationId: result.operationId }, 202);
  };
}
