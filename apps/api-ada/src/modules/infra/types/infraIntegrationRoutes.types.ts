/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { ConsumeRateLimit } from '@/modules/infra/types/infraRoutes.types';
import type {
  GetInfraIntegrationResult,
  RemoveInfraIntegrationParams,
  RemoveInfraIntegrationResult,
  SaveInfraIntegrationParams,
  SaveInfraIntegrationResult,
  VerifyInfraIntegrationParams,
  VerifyInfraIntegrationResult,
} from '@/modules/infra/types/infraIntegrationUseCases.types';

export type InfraIntegrationRoutesDependencies = {
  readonly getInfraIntegration: { execute(): Promise<GetInfraIntegrationResult> };
  readonly saveInfraIntegration: { execute(params: SaveInfraIntegrationParams): Promise<SaveInfraIntegrationResult> };
  readonly removeInfraIntegration: {
    execute(params: RemoveInfraIntegrationParams): Promise<RemoveInfraIntegrationResult>;
  };
  readonly verifyInfraIntegration: {
    execute(params: VerifyInfraIntegrationParams): Promise<VerifyInfraIntegrationResult>;
  };
  /** Padrao = Redis real; o teste injeta um contador em memoria. */
  readonly consumeRateLimit?: ConsumeRateLimit;
};
