/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { createInfraRoutes } from '@adatechnology/infra-module';
import type { InfraRoutesDependencies as ModuleRoutesDependencies } from '@adatechnology/infra-contracts';

import type { Route } from '@/infra/http/router';
import { adaptInfraRoutes } from '@/modules/infra/adaptInfraRoutes';
import { buildInfraRateLimiter } from '@/modules/infra/buildInfraRateLimiter';
import type { InfraIntegrationRoutesDependencies } from '@/modules/infra/types/infraIntegrationRoutes.types';

const INTEGRATION_OPERATION_IDS = new Set([
  'getInfraIntegration',
  'saveInfraIntegration',
  'verifyInfraIntegration',
  'removeInfraIntegration',
]);

function unavailable(): never {
  throw new Error('Caso de uso de ambientes nao montado nesta fabrica de rotas');
}

/** Todas `isNoStore`: o router poe `Cache-Control: no-store` em sucesso e em qualquer erro. */
export function buildInfraIntegrationRoutes(dependencies: InfraIntegrationRoutesDependencies): readonly Route[] {
  const moduleDependencies: ModuleRoutesDependencies = {
    listInfraEnvironments: { execute: unavailable },
    powerOffEnvironment: { execute: unavailable },
    powerOnEnvironment: { execute: unavailable },
    getInfraOperation: { execute: unavailable },
    getInfraCosts: { execute: unavailable },
    saveEnvironmentSchedule: { execute: unavailable },
    getInfraIntegration: dependencies.getInfraIntegration,
    saveInfraIntegration: dependencies.saveInfraIntegration,
    removeInfraIntegration: dependencies.removeInfraIntegration,
    verifyInfraIntegration: dependencies.verifyInfraIntegration,
    rateLimiter: buildInfraRateLimiter(dependencies.consumeRateLimit),
  };
  const routes = createInfraRoutes(moduleDependencies).filter((route) =>
    INTEGRATION_OPERATION_IDS.has(route.operationId),
  );

  return adaptInfraRoutes(routes);
}
