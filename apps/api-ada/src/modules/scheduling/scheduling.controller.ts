/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { createSchedulingRoutes } from '@adatechnology/scheduling-module';
import { createModuleFetchRouter } from '@adatechnology/scheduling-module/http/fetch';

import { schedulingModule } from '@/infra/container';
import type { Route } from '@/infra/http/router';
import { SCHEDULING_BASE_PATH } from '@/modules/scheduling/scheduling.constant';
import { schedulingAuthResolver } from '@/modules/scheduling/schedulingAuthResolver';
import { buildSchedulingRoutes } from '@/modules/scheduling/schedulingRouteBridge';

const moduleRoutes = createSchedulingRoutes({ module: schedulingModule });

const moduleRouter = createModuleFetchRouter({
  routes: moduleRoutes,
  basePath: SCHEDULING_BASE_PATH,
  authResolver: schedulingAuthResolver,
});

export const schedulingRoutes: readonly Route[] = buildSchedulingRoutes({
  moduleRoutes,
  handle: (request) => moduleRouter.handle(request),
});
