/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { jsonData } from '@/infra/http/responses';
import { AUTH_REQUIREMENT, HTTP_METHOD, requireAgent, type Route } from '@/infra/http/router';
import { ACTOR_TYPE } from '@/modules/audit/audit.constant';
import { buildInfraPowerHandler } from '@/modules/infra/buildInfraPowerHandler';
import { infraEnvironmentParamsSchema, infraScheduleBodySchema } from '@/modules/infra/infra.schema';
import {
  INFRA_ENVIRONMENT_PATH,
  INFRA_POWER_OFF_AGENT_BUCKET,
  INFRA_POWER_ON_AGENT_BUCKET,
} from '@/modules/infra/infraRoutes.constant';
import type { ConsumeRateLimit, InfraRoutesDependencies } from '@/modules/infra/types/infraRoutes.types';

type BuildInfraWriteRoutesParams = {
  readonly dependencies: InfraRoutesDependencies;
  readonly consumeRateLimit: ConsumeRateLimit;
};

type InfraWriteRoutes = {
  readonly powerOff: Route;
  readonly powerOn: Route;
  readonly saveSchedule: Route;
};

function buildSaveScheduleRoute(dependencies: InfraRoutesDependencies): Route {
  return {
    method: HTTP_METHOD.PUT,
    path: `${INFRA_ENVIRONMENT_PATH}/schedule`,
    auth: AUTH_REQUIREMENT.ADMIN,
    rateLimit: RATE_LIMIT.PANEL_WRITE,
    handler: async (context) => {
      const { environmentId } = infraEnvironmentParamsSchema.parse(context.params);
      const { agentId } = requireAgent(context);
      const body = infraScheduleBodySchema.parse(await context.request.json().catch(() => ({})));

      const result = await dependencies.saveEnvironmentSchedule.execute({
        ...body,
        environmentId,
        actor: { type: ACTOR_TYPE.AGENT, agentId },
        ipAddress: context.clientAddress,
      });
      const { updatedByAgentId: _updatedByAgentId, ...schedule } = result.schedule;

      return jsonData({ ...schedule, nextScheduledAction: result.nextScheduledAction });
    },
  };
}

export function buildInfraWriteRoutes(params: BuildInfraWriteRoutesParams): InfraWriteRoutes {
  const { dependencies, consumeRateLimit } = params;
  const powerOff: Route = {
    method: HTTP_METHOD.POST,
    path: `${INFRA_ENVIRONMENT_PATH}/power-off`,
    auth: AUTH_REQUIREMENT.ADMIN,
    rateLimit: RATE_LIMIT.PANEL_INFRA_POWER,
    handler: buildInfraPowerHandler({
      useCase: dependencies.powerOffEnvironment,
      agentBucket: INFRA_POWER_OFF_AGENT_BUCKET,
      consumeRateLimit,
    }),
  };

  const powerOn: Route = {
    method: HTTP_METHOD.POST,
    path: `${INFRA_ENVIRONMENT_PATH}/power-on`,
    auth: AUTH_REQUIREMENT.ADMIN,
    rateLimit: RATE_LIMIT.PANEL_INFRA_POWER,
    handler: buildInfraPowerHandler({
      useCase: dependencies.powerOnEnvironment,
      agentBucket: INFRA_POWER_ON_AGENT_BUCKET,
      consumeRateLimit,
      isKeepOnUntilAccepted: true,
    }),
  };

  return { powerOff, powerOn, saveSchedule: buildSaveScheduleRoute(dependencies) };
}
