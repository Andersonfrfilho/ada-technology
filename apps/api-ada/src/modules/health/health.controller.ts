/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { sql } from 'drizzle-orm';

import { database } from '@/infra/database/client';
import { HTTP_METHOD, type Route } from '@/infra/http/router';
import { jsonData } from '@/infra/http/responses';
import { environment } from '@/infra/config/environment';

async function isDatabaseReachable(): Promise<boolean> {
  try {
    await database.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}

export const healthRoutes: readonly Route[] = [
  {
    method: HTTP_METHOD.GET,
    path: '/health',
    handler: () => jsonData({ status: 'ok', app: environment.APP_NAME, env: environment.ENV }),
  },
  {
    method: HTTP_METHOD.GET,
    path: '/health/ready',
    handler: async () => {
      const databaseReachable = await isDatabaseReachable();

      return jsonData({ status: databaseReachable ? 'ready' : 'degraded', databaseReachable },
        databaseReachable ? 200 : 503);
    },
  },
];
