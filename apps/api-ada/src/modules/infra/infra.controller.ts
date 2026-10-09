/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import {
  getInfraCosts,
  getInfraOperation,
  listInfraEnvironments,
  powerOffEnvironment,
  powerOnEnvironment,
  saveEnvironmentSchedule,
} from '@/infra/container';
import type { Route } from '@/infra/http/router';
import { buildInfraRoutes } from '@/modules/infra/buildInfraRoutes';

export const infraRoutes: readonly Route[] = buildInfraRoutes({
  listInfraEnvironments,
  powerOffEnvironment,
  powerOnEnvironment,
  getInfraOperation,
  getInfraCosts,
  saveEnvironmentSchedule,
});
