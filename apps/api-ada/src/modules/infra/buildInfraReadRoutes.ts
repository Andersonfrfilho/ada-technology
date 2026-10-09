/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { jsonData } from '@/infra/http/responses';
import { AUTH_REQUIREMENT, HTTP_METHOD, type Route } from '@/infra/http/router';
import { INFRA_COSTS_PATH, INFRA_ENVIRONMENTS_PATH, INFRA_OPERATION_PATH } from '@/modules/infra/infraRoutes.constant';
import { infraOperationParamsSchema } from '@/modules/infra/infra.schema';
import type { InfraEnvironmentView } from '@/modules/infra/types/infraListing.types';
import type { InfraRoutesDependencies } from '@/modules/infra/types/infraRoutes.types';

type InfraReadRoutes = {
  readonly listEnvironments: Route;
  readonly getOperation: Route;
  readonly getCosts: Route;
};

/** O registro da agenda carrega `updatedByAgentId`; o painel nao precisa saber quem editou por ultimo. */
function toEnvironmentResponse(environment: InfraEnvironmentView): Omit<InfraEnvironmentView, 'schedule'> & {
  readonly schedule?: Omit<NonNullable<InfraEnvironmentView['schedule']>, 'updatedByAgentId'>;
} {
  const { schedule, ...rest } = environment;
  if (!schedule) return rest;

  const { updatedByAgentId: _updatedByAgentId, ...publicSchedule } = schedule;
  return { ...rest, schedule: publicSchedule };
}

function buildListEnvironmentsRoute(dependencies: InfraRoutesDependencies): Route {
  return {
    method: HTTP_METHOD.GET,
    path: INFRA_ENVIRONMENTS_PATH,
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
}

export function buildInfraReadRoutes(dependencies: InfraRoutesDependencies): InfraReadRoutes {
  const listEnvironments = buildListEnvironmentsRoute(dependencies);

  const getOperation: Route = {
    method: HTTP_METHOD.GET,
    path: INFRA_OPERATION_PATH,
    auth: AUTH_REQUIREMENT.ADMIN,
    rateLimit: RATE_LIMIT.PANEL_READ,
    handler: async (context) => {
      const { operationId } = infraOperationParamsSchema.parse(context.params);

      return jsonData(await dependencies.getInfraOperation.execute({ operationId }));
    },
  };

  const getCosts: Route = {
    method: HTTP_METHOD.GET,
    path: INFRA_COSTS_PATH,
    auth: AUTH_REQUIREMENT.ADMIN,
    rateLimit: RATE_LIMIT.PANEL_READ,
    handler: async () => jsonData(await dependencies.getInfraCosts.execute()),
  };

  return { listEnvironments, getOperation, getCosts };
}
