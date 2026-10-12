/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { beforeEach, describe, expect, it } from 'bun:test';

import {
  INFRA_POWER_EXPECTATION_TIMEOUT_MS,
  clearPowerExpectations,
  hasPendingPowerExpectation,
  registerPowerExpectation,
} from '@/modules/infra/powerExpectation.util';
import type { ListInfraEnvironmentsResult } from '@/modules/infra/types/infra.types';

function buildResult(environmentId: string, state: 'running' | 'stopped' | 'partial'): ListInfraEnvironmentsResult {
  return {
    access: 'ok',
    projects: [
      {
        projectId: 'project-1',
        projectName: 'project',
        environments: [
          { environmentId, environmentName: 'staging', classification: 'managed', state, services: [], requiresKeepOnUntil: false },
        ],
      },
    ],
  } as unknown as ListInfraEnvironmentsResult;
}

describe('power expectation', () => {
  beforeEach(() => clearPowerExpectations());

  it('keeps polling after power off while the environment is not stopped yet', () => {
    registerPowerExpectation({ environmentId: 'env-1', direction: 'off', now: 1_000 });

    expect(hasPendingPowerExpectation({ data: buildResult('env-1', 'running'), now: 2_000 })).toBe(true);
    expect(hasPendingPowerExpectation({ data: buildResult('env-1', 'partial'), now: 3_000 })).toBe(true);
  });

  it('stops polling once the environment reaches the expected state', () => {
    registerPowerExpectation({ environmentId: 'env-1', direction: 'off', now: 1_000 });

    expect(hasPendingPowerExpectation({ data: buildResult('env-1', 'stopped'), now: 2_000 })).toBe(false);
    expect(hasPendingPowerExpectation({ data: buildResult('env-1', 'running'), now: 3_000 })).toBe(false);
  });

  it('expects running after power on', () => {
    registerPowerExpectation({ environmentId: 'env-1', direction: 'on', now: 1_000 });

    expect(hasPendingPowerExpectation({ data: buildResult('env-1', 'stopped'), now: 2_000 })).toBe(true);
    expect(hasPendingPowerExpectation({ data: buildResult('env-1', 'running'), now: 3_000 })).toBe(false);
  });

  it('gives up after the timeout so a state that never settles cannot poll forever', () => {
    registerPowerExpectation({ environmentId: 'env-1', direction: 'off', now: 1_000 });
    const afterTimeout = 1_000 + INFRA_POWER_EXPECTATION_TIMEOUT_MS + 1;

    expect(hasPendingPowerExpectation({ data: buildResult('env-1', 'partial'), now: afterTimeout })).toBe(false);
  });

  it('ignores an expectation for an environment that left the list', () => {
    registerPowerExpectation({ environmentId: 'env-gone', direction: 'off', now: 1_000 });

    expect(hasPendingPowerExpectation({ data: buildResult('env-1', 'running'), now: 2_000 })).toBe(false);
  });

  it('keeps polling while there is no data yet', () => {
    registerPowerExpectation({ environmentId: 'env-1', direction: 'off', now: 1_000 });

    expect(hasPendingPowerExpectation({ data: undefined, now: 2_000 })).toBe(true);
  });
});
