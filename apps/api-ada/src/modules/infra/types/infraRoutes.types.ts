/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { ConsumeRateLimitParams, RateLimitVerdict } from '@/infra/http/rateLimit';
import type { CostsResult } from '@/modules/infra/types/infraCosts.types';
import type { ListInfraEnvironmentsResult } from '@/modules/infra/types/infraListing.types';
import type {
  GetInfraOperationParams,
  GetInfraOperationResult,
  PowerEnvironmentParams,
  PowerEnvironmentResult,
} from '@/modules/infra/types/infraOperation.types';
import type {
  SaveEnvironmentScheduleParams,
  SaveEnvironmentScheduleResult,
} from '@/modules/infra/types/infraSchedule.types';

export type ConsumeRateLimit = (params: ConsumeRateLimitParams) => Promise<RateLimitVerdict>;

export type InfraRoutesDependencies = {
  readonly listInfraEnvironments: { execute(): Promise<ListInfraEnvironmentsResult> };
  readonly powerOffEnvironment: { execute(params: PowerEnvironmentParams): Promise<PowerEnvironmentResult> };
  readonly powerOnEnvironment: { execute(params: PowerEnvironmentParams): Promise<PowerEnvironmentResult> };
  readonly getInfraOperation: { execute(params: GetInfraOperationParams): Promise<GetInfraOperationResult> };
  readonly getInfraCosts: { execute(): Promise<CostsResult> };
  readonly saveEnvironmentSchedule: {
    execute(params: SaveEnvironmentScheduleParams): Promise<SaveEnvironmentScheduleResult>;
  };
  /** Padrão = Redis real; o teste injeta um contador em memória. */
  readonly consumeRateLimit?: ConsumeRateLimit;
};

export type InfraPowerUseCase = InfraRoutesDependencies['powerOffEnvironment'];
