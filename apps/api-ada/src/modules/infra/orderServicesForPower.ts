/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { INFRA_POWER_DIRECTION } from '@/modules/infra/infra.constant';
import { isDatabaseService } from '@/modules/infra/isDatabaseService';
import type {
  OrderServicesForPowerParams,
  OrderServicesForPowerResult,
} from '@/modules/infra/types/railwayInventory.types';

export function orderServicesForPower(params: OrderServicesForPowerParams): OrderServicesForPowerResult {
  const { services, direction } = params;
  const databases = services.filter(isDatabaseService);
  const applications = services.filter((service) => !isDatabaseService(service));
  const ordered =
    direction === INFRA_POWER_DIRECTION.OFF ? [...applications, ...databases] : [...databases, ...applications];
  return { ordered };
}
