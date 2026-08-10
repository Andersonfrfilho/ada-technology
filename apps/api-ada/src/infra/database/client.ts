/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import { environment } from '@/infra/config/environment';
import * as schema from '@/infra/database/schema';

const pool = new pg.Pool({
  connectionString: environment.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export const database = drizzle(pool, { schema });

export type Database = typeof database;

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
