/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { createUserRoutes } from '@adatechnology/user-module';
import { createModuleFetchRouter } from '@adatechnology/user-module/http/fetch';

import { userModule } from '@/infra/container';
import type { Route } from '@/infra/http/router';
import { USER_BASE_PATH } from '@/modules/user/user.constant';
import { userAuthResolver } from '@/modules/user/userAuthResolver';
import { buildUserRoutes } from '@/modules/user/userRouteBridge';

const moduleRoutes = createUserRoutes({ module: userModule });

const moduleRouter = createModuleFetchRouter({
  routes: moduleRoutes,
  basePath: USER_BASE_PATH,
  authResolver: userAuthResolver,
});

export const userRoutes: readonly Route[] = buildUserRoutes({
  moduleRoutes,
  handle: (request) => moduleRouter.handle(request),
});
