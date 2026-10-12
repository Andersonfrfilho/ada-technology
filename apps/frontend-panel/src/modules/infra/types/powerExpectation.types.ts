/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { InfraEnvironmentPowerState } from '@/modules/infra/infra.constant';
import type { ListInfraEnvironmentsResult } from '@/modules/infra/types/infra.types';

export type PowerExpectation = {
  readonly expectedState: InfraEnvironmentPowerState;
  readonly expiresAt: number;
};

export type RegisterPowerExpectationParams = {
  readonly environmentId: string;
  readonly direction: 'on' | 'off';
  readonly now: number;
};

export type HasPendingPowerExpectationParams = {
  readonly data: ListInfraEnvironmentsResult | undefined;
  readonly now: number;
};
