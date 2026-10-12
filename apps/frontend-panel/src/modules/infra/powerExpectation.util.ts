/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { INFRA_ENVIRONMENT_POWER_STATE, type InfraEnvironmentPowerState } from '@/modules/infra/infra.constant';
import type { ListInfraEnvironmentsResult } from '@/modules/infra/types/infra.types';
import type {
  HasPendingPowerExpectationParams,
  PowerExpectation,
  RegisterPowerExpectationParams,
} from '@/modules/infra/types/powerExpectation.types';

export const INFRA_POWER_EXPECTATION_TIMEOUT_MS = 3 * 60_000;

// O Railway leva segundos para refletir a parada/religacao: a lista nao pode congelar no estado antigo.
const expectations = new Map<string, PowerExpectation>();

export function clearPowerExpectations(): void {
  expectations.clear();
}

export function registerPowerExpectation(params: RegisterPowerExpectationParams): void {
  const { environmentId, direction, now } = params;
  const expectedState =
    direction === 'off' ? INFRA_ENVIRONMENT_POWER_STATE.STOPPED : INFRA_ENVIRONMENT_POWER_STATE.RUNNING;

  expectations.set(environmentId, { expectedState, expiresAt: now + INFRA_POWER_EXPECTATION_TIMEOUT_MS });
}

function findEnvironmentState(
  data: ListInfraEnvironmentsResult,
  environmentId: string,
): InfraEnvironmentPowerState | undefined {
  for (const project of data.projects) {
    const environment = project.environments.find((candidate) => candidate.environmentId === environmentId);
    if (environment) return environment.state;
  }
  return undefined;
}

export function hasPendingPowerExpectation(params: HasPendingPowerExpectationParams): boolean {
  const { data, now } = params;
  let hasPending = false;

  for (const [environmentId, expectation] of expectations) {
    const currentState = data ? findEnvironmentState(data, environmentId) : undefined;
    const isSettled = data !== undefined && currentState === expectation.expectedState;
    const isGone = data !== undefined && currentState === undefined;

    if (isSettled || isGone || now > expectation.expiresAt) {
      expectations.delete(environmentId);
      continue;
    }
    hasPending = true;
  }

  return hasPending;
}
