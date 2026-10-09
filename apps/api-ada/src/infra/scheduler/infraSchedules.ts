/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */


import type { ScheduledTask } from '@/infra/scheduler/scheduler';
import type { RunInfraSchedulesUseCase } from '@/modules/infra/runInfraSchedules.use-case';

export const INFRA_SCHEDULES_TASK_NAME = 'infra-schedules';
export const INFRA_SCHEDULES_CRON_EXPRESSION = '* * * * *';

export function buildInfraSchedulesTask(useCase: Pick<RunInfraSchedulesUseCase, 'execute'>): ScheduledTask {
  return {
    name: INFRA_SCHEDULES_TASK_NAME,
    cronExpression: INFRA_SCHEDULES_CRON_EXPRESSION,
    run: () => useCase.execute(),
  };
}
