/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { ConsumeRateLimitParams, RateLimitVerdict } from '@/infra/http/rateLimit';
import type { InfraRoutesDependencies as ModuleRoutesDependencies } from '@adatechnology/infra-contracts';

export type ConsumeRateLimit = (params: ConsumeRateLimitParams) => Promise<RateLimitVerdict>;

export type InfraRoutesDependencies = Pick<
  ModuleRoutesDependencies,
  | 'listInfraEnvironments'
  | 'powerOffEnvironment'
  | 'powerOnEnvironment'
  | 'getInfraOperation'
  | 'getInfraCosts'
  | 'saveEnvironmentSchedule'
> & {
  /** Padrão = Redis real; o teste injeta um contador em memória. */
  readonly consumeRateLimit?: ConsumeRateLimit;
};

export type InfraPowerUseCase = InfraRoutesDependencies['powerOffEnvironment'];
