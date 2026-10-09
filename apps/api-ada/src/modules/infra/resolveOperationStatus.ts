/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import {
  INFRA_OPERATION_STATUS,
  INFRA_SERVICE_OUTCOME,
  type InfraOperationStatus,
} from '@/modules/infra/infra.constant';
import type { InfraServiceResult, ResolveOperationStatusParams } from '@/modules/infra/types/infraOperation.types';

export type ServiceOutcomeCounts = { readonly ok: number; readonly failed: number; readonly skipped: number };

export function countServiceOutcomes(serviceResults: readonly InfraServiceResult[]): ServiceOutcomeCounts {
  const countOf = (outcome: string): number => serviceResults.filter((result) => result.outcome === outcome).length;
  return {
    ok: countOf(INFRA_SERVICE_OUTCOME.OK),
    failed: countOf(INFRA_SERVICE_OUTCOME.FAILED),
    skipped: countOf(INFRA_SERVICE_OUTCOME.SKIPPED),
  };
}

export function resolveOperationStatus(params: ResolveOperationStatusParams): InfraOperationStatus {
  const { ok, failed } = countServiceOutcomes(params.serviceResults);
  if (failed === 0) return INFRA_OPERATION_STATUS.SUCCEEDED;
  return ok > 0 ? INFRA_OPERATION_STATUS.PARTIALLY_FAILED : INFRA_OPERATION_STATUS.FAILED;
}
