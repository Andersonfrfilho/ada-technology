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
import {
  infraEnvironmentParamsSchema,
  infraOperationParamsSchema,
  infraPowerOnBodySchema,
  infraScheduleBodySchema,
} from '@/modules/infra/infra.schema';
import type {
  CostsResult,
  GetInfraOperationParams,
  GetInfraOperationResult,
  InfraEnvironmentView,
  ListInfraEnvironmentsResult,
  PowerEnvironmentParams,
  PowerEnvironmentResult,
  SaveEnvironmentScheduleParams,
  SaveEnvironmentScheduleResult,
} from '@/modules/infra/types/infra.types';

const ENVIRONMENTS_PATH = '/v1/panel/infra/environments';
const ENVIRONMENT_PATH = `${ENVIRONMENTS_PATH}/:environmentId`;
const OPERATION_PATH = '/v1/panel/infra/operations/:operationId';
const COSTS_PATH = '/v1/panel/infra/costs';

export type InfraRoutesDependencies = {
  readonly listInfraEnvironments: { execute(): Promise<ListInfraEnvironmentsResult> };
  readonly powerOffEnvironment: { execute(params: PowerEnvironmentParams): Promise<PowerEnvironmentResult> };
  readonly powerOnEnvironment: { execute(params: PowerEnvironmentParams): Promise<PowerEnvironmentResult> };
  readonly getInfraOperation: { execute(params: GetInfraOperationParams): Promise<GetInfraOperationResult> };
  readonly getInfraCosts: { execute(): Promise<CostsResult> };
  readonly saveEnvironmentSchedule: {
    execute(params: SaveEnvironmentScheduleParams): Promise<SaveEnvironmentScheduleResult>;
  };
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

function buildPowerHandler(params: { readonly useCase: PowerUseCase; readonly isKeepOnUntilAccepted?: boolean }) {
  const { useCase, isKeepOnUntilAccepted } = params;

  return async (context: RequestContext): Promise<Response> => {
    const { environmentId } = infraEnvironmentParamsSchema.parse(context.params);
    const { agentId } = requireAgent(context);
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
    handler: buildPowerHandler({ useCase: dependencies.powerOffEnvironment }),
  };

  const powerOnRoute: Route = {
    method: HTTP_METHOD.POST,
    path: `${ENVIRONMENT_PATH}/power-on`,
    auth: AUTH_REQUIREMENT.ADMIN,
    rateLimit: RATE_LIMIT.PANEL_INFRA_POWER,
    handler: buildPowerHandler({ useCase: dependencies.powerOnEnvironment, isKeepOnUntilAccepted: true }),
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

  const getCostsRoute: Route = {
    method: HTTP_METHOD.GET,
    path: COSTS_PATH,
    auth: AUTH_REQUIREMENT.ADMIN,
    rateLimit: RATE_LIMIT.PANEL_READ,
    handler: async () => jsonData(await dependencies.getInfraCosts.execute()),
  };

  const saveScheduleRoute: Route = {
    method: HTTP_METHOD.PUT,
    path: `${ENVIRONMENT_PATH}/schedule`,
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

  return [listEnvironmentsRoute, powerOffRoute, powerOnRoute, getOperationRoute, getCostsRoute, saveScheduleRoute];
}
