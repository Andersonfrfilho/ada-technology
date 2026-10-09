/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { INFRA_SERVICE_POWER_STATE, type InfraServicePowerState } from '@/modules/infra/infra.constant';
import type { RailwayServiceInstance } from '@/modules/infra/types/infra.types';

const RUNNING_INSTANCE_STATUS = 'RUNNING';

export function resolveServicePowerState(service: RailwayServiceInstance): InfraServicePowerState {
  if (!service.hasDeployment) return INFRA_SERVICE_POWER_STATE.NO_DEPLOYMENT;
  // O deployment parado continua com status SUCCESS; só deploymentStopped o distingue.
  if (service.isStopped) return INFRA_SERVICE_POWER_STATE.STOPPED;
  if (service.instanceStatus === RUNNING_INSTANCE_STATUS) return INFRA_SERVICE_POWER_STATE.RUNNING;
  return INFRA_SERVICE_POWER_STATE.TRANSITIONING;
}
