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
import type { InfraRoutesDependencies } from '@/modules/infra/types/infraRoutes.types';

const ENVIRONMENT_OPERATION_IDS = new Set([
  'listInfraEnvironments',
  'powerOffInfraEnvironment',
  'powerOnInfraEnvironment',
  'getInfraOperation',
  'getInfraCosts',
  'saveInfraEnvironmentSchedule',
]);

function unavailable(): never {
  throw new Error('Caso de uso de integracao nao montado nesta fabrica de rotas');
}

/** Fabrica sem o container: o teste injeta use cases falsos e nunca encosta no provedor, Redis ou banco. */
export function buildInfraRoutes(dependencies: InfraRoutesDependencies): readonly Route[] {
  const moduleDependencies: ModuleRoutesDependencies = {
    ...dependencies,
    getInfraIntegration: { execute: unavailable },
    saveInfraIntegration: { execute: unavailable },
    removeInfraIntegration: { execute: unavailable },
    verifyInfraIntegration: { execute: unavailable },
    rateLimiter: buildInfraRateLimiter(dependencies.consumeRateLimit),
  };
  const routes = createInfraRoutes(moduleDependencies).filter((route) =>
    ENVIRONMENT_OPERATION_IDS.has(route.operationId),
  );

  return adaptInfraRoutes(routes);
}
