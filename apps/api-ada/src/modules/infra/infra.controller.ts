/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { infraModule } from '@/infra/container';
import type { Route } from '@/infra/http/router';
import { adaptInfraRoutes } from '@/modules/infra/adaptInfraRoutes';

export const infraRoutes: readonly Route[] = adaptInfraRoutes(infraModule.routes);
