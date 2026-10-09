/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { consumeRateLimit } from '@/infra/http/rateLimit';
import type { Route } from '@/infra/http/router';
import { buildInfraReadRoutes } from '@/modules/infra/buildInfraReadRoutes';
import { buildInfraWriteRoutes } from '@/modules/infra/buildInfraWriteRoutes';
import type { InfraRoutesDependencies } from '@/modules/infra/types/infraRoutes.types';

/** Fabrica sem o container: o teste injeta use cases falsos e nunca encosta no Railway, Redis ou banco. */
export function buildInfraRoutes(dependencies: InfraRoutesDependencies): readonly Route[] {
  const read = buildInfraReadRoutes(dependencies);
  const write = buildInfraWriteRoutes({
    dependencies,
    consumeRateLimit: dependencies.consumeRateLimit ?? consumeRateLimit,
  });

  return [read.listEnvironments, write.powerOff, write.powerOn, read.getOperation, read.getCosts, write.saveSchedule];
}
