/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { jsonData } from '@/infra/http/responses';
import { AUTH_REQUIREMENT, HTTP_METHOD, requireAgent, type RequestContext, type Route } from '@/infra/http/router';
import { ACTOR_TYPE } from '@/modules/audit/audit.constant';
import { INFRA_OPERATION_TRIGGER } from '@/modules/infra/infra.constant';
import { infraEnvironmentParamsSchema, infraOperationParamsSchema } from '@/modules/infra/infra.schema';
import type {
  GetInfraOperationParams,
  GetInfraOperationResult,
  InfraEnvironmentView,
  ListInfraEnvironmentsResult,
  PowerEnvironmentParams,
  PowerEnvironmentResult,
} from '@/modules/infra/types/infra.types';

const ENVIRONMENTS_PATH = '/v1/panel/infra/environments';
const ENVIRONMENT_PATH = `${ENVIRONMENTS_PATH}/:environmentId`;
const OPERATION_PATH = '/v1/panel/infra/operations/:operationId';

export type InfraRoutesDependencies = {
  readonly listInfraEnvironments: { execute(): Promise<ListInfraEnvironmentsResult> };
  readonly powerOffEnvironment: { execute(params: PowerEnvironmentParams): Promise<PowerEnvironmentResult> };
  readonly powerOnEnvironment: { execute(params: PowerEnvironmentParams): Promise<PowerEnvironmentResult> };
  readonly getInfraOperation: { execute(params: GetInfraOperationParams): Promise<GetInfraOperationResult> };
};

type PowerUseCase = InfraRoutesDependencies['powerOffEnvironment'];

/** O registro da agenda carrega `updatedByAgentId`; o painel nao precisa saber quem editou por ultimo. */
function toEnvironmentResponse(environment: InfraEnvironmentView): Omit<InfraEnvironmentView, 'schedule'> & {
  readonly schedule?: Omit<NonNullable<InfraEnvironmentView['schedule']>, 'updatedByAgentId'>;
} {
  const { schedule, ...rest } = environment;
  if (!schedule) return rest;

  const { updatedByAgentId: _updatedByAgentId, ...publicSchedule } = schedule;
  return { ...rest, schedule: publicSchedule };
}

function buildPowerHandler(useCase: PowerUseCase) {
  return async (context: RequestContext): Promise<Response> => {
    const { environmentId } = infraEnvironmentParamsSchema.parse(context.params);
    const { agentId } = requireAgent(context);

    const result = await useCase.execute({
      environmentId,
      actor: { type: ACTOR_TYPE.AGENT, agentId },
      trigger: INFRA_OPERATION_TRIGGER.MANUAL,
      ipAddress: context.clientAddress,
    });

    return jsonData({ operationId: result.operationId }, 202);
  };
}

/** Fabrica sem o container: o teste injeta use cases falsos e nunca encosta no Railway, Redis ou banco. */
export function buildInfraRoutes(dependencies: InfraRoutesDependencies): readonly Route[] {
  const listEnvironmentsRoute: Route = {
    method: HTTP_METHOD.GET,
    path: ENVIRONMENTS_PATH,
    auth: AUTH_REQUIREMENT.ADMIN,
    rateLimit: RATE_LIMIT.PANEL_READ,
    handler: async () => {
      const result = await dependencies.listInfraEnvironments.execute();

      return jsonData({
        access: result.access,
        projects: result.projects.map((project) => ({
          ...project,
          environments: project.environments.map(toEnvironmentResponse),
        })),
      });
    },
  };

  const powerOffRoute: Route = {
    method: HTTP_METHOD.POST,
    path: `${ENVIRONMENT_PATH}/power-off`,
    auth: AUTH_REQUIREMENT.ADMIN,
    rateLimit: RATE_LIMIT.PANEL_INFRA_POWER,
    handler: buildPowerHandler(dependencies.powerOffEnvironment),
  };

  const powerOnRoute: Route = {
    method: HTTP_METHOD.POST,
    path: `${ENVIRONMENT_PATH}/power-on`,
    auth: AUTH_REQUIREMENT.ADMIN,
    rateLimit: RATE_LIMIT.PANEL_INFRA_POWER,
    handler: buildPowerHandler(dependencies.powerOnEnvironment),
  };

  const getOperationRoute: Route = {
    method: HTTP_METHOD.GET,
    path: OPERATION_PATH,
    auth: AUTH_REQUIREMENT.ADMIN,
    rateLimit: RATE_LIMIT.PANEL_READ,
    handler: async (context) => {
      const { operationId } = infraOperationParamsSchema.parse(context.params);

      return jsonData(await dependencies.getInfraOperation.execute({ operationId }));
    },
  };

  return [listEnvironmentsRoute, powerOffRoute, powerOnRoute, getOperationRoute];
}
