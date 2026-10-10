/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import {
  buildInfraScheduledTasks,
  shouldRecoverInfraOperationsAtBoot,
} from '@/infra/scheduler/buildInfraScheduledTasks';
import type { ScheduledTask } from '@/infra/scheduler/scheduler';

const TASK: ScheduledTask = { name: 'infra-schedules', cronExpression: '* * * * *', run: async () => undefined };

describe('buildInfraScheduledTasks', () => {
  it.each(['dev', 'test', 'staging'] as const)('registers nothing in %s', (env) => {
    expect(buildInfraScheduledTasks({ env, infraSchedulesTask: TASK })).toEqual([]);
  });

  it('registers the task in production', () => {
    expect(buildInfraScheduledTasks({ env: 'production', infraSchedulesTask: TASK })).toEqual([TASK]);
  });
});

describe('shouldRecoverInfraOperationsAtBoot', () => {
  it.each(['dev', 'test', 'staging'] as const)('is false in %s', (env) => {
    expect(shouldRecoverInfraOperationsAtBoot({ env })).toBe(false);
  });

  it('is true in production', () => {
    expect(shouldRecoverInfraOperationsAtBoot({ env: 'production' })).toBe(true);
  });
});
