/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { INFRA_POWER_DIRECTION } from '@/modules/infra/infra.constant';
import {
  PowerEnvironmentUseCase,
  type PowerEnvironmentDependencies,
} from '@/modules/infra/powerEnvironment.use-case';

export class PowerOnEnvironmentUseCase extends PowerEnvironmentUseCase {
  constructor(dependencies: PowerEnvironmentDependencies) {
    super({ ...dependencies, direction: INFRA_POWER_DIRECTION.ON });
  }
}
