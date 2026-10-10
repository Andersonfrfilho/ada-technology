/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */


import type { ScheduledTask } from '@/infra/scheduler/scheduler';

const PRODUCTION = 'production';

type EnvParams = { readonly env: string };

// Token do Railway só existe em produção; fora dela um relógio ocioso seria timer sem o que fazer.
export function shouldRecoverInfraOperationsAtBoot(params: EnvParams): boolean {
  return params.env === PRODUCTION;
}

export function buildInfraScheduledTasks(
  params: EnvParams & { readonly infraSchedulesTask: ScheduledTask },
): readonly ScheduledTask[] {
  return shouldRecoverInfraOperationsAtBoot(params) ? [params.infraSchedulesTask] : [];
}
