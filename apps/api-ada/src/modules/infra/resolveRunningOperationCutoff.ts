/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { INFRA_OPERATION_LOCK_GRACE_SECONDS } from '@/modules/infra/infra.constant';

const MILLISECONDS_PER_SECOND = 1000;

type ResolveRunningOperationCutoffParams = {
  readonly now: Date;
  readonly databaseWaitSeconds: number;
};

/** Operação `running` iniciada antes disto já perdeu a trava (TTL vencido): o processo dela morreu. */
export function resolveRunningOperationCutoff(params: ResolveRunningOperationCutoffParams): Date {
  const lockTtlSeconds = params.databaseWaitSeconds + INFRA_OPERATION_LOCK_GRACE_SECONDS;
  return new Date(params.now.getTime() - lockTtlSeconds * MILLISECONDS_PER_SECOND);
}
