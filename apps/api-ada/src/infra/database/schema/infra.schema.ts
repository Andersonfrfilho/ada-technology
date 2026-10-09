/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { sql } from 'drizzle-orm';
import { boolean, index, jsonb, pgTable, smallint, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const infraEnvironmentSchedules = pgTable('infra_environment_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  railwayProjectId: varchar('railway_project_id', { length: 64 }).notNull(),
  railwayEnvironmentId: varchar('railway_environment_id', { length: 64 }).notNull().unique(),
  activeWeekdays: smallint('active_weekdays').array().notNull(),
  powerOnTime: varchar('power_on_time', { length: 5 }).notNull(),
  powerOffTime: varchar('power_off_time', { length: 5 }).notNull(),
  timezone: varchar('timezone', { length: 40 }).notNull().default('America/Sao_Paulo'),
  isEnabled: boolean('is_enabled').notNull().default(true),
  keepOnUntil: timestamp('keep_on_until', { withTimezone: true }),
  lastEvaluatedAt: timestamp('last_evaluated_at', { withTimezone: true }),
  lastPowerOffAt: timestamp('last_power_off_at', { withTimezone: true }),
  lastPowerOnAt: timestamp('last_power_on_at', { withTimezone: true }),
  updatedByAgentId: uuid('updated_by_agent_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const infraPowerOperations = pgTable(
  'infra_power_operations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    railwayProjectId: varchar('railway_project_id', { length: 64 }).notNull(),
    railwayEnvironmentId: varchar('railway_environment_id', { length: 64 }).notNull(),
    kind: varchar('kind', { length: 20 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    trigger: varchar('trigger', { length: 20 }).notNull(),
    actorAgentId: uuid('actor_agent_id'),
    serviceResults: jsonb('service_results').notNull().default(sql`'[]'::jsonb`),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (table) => [
    index('infra_power_operations_environment_started_idx').on(table.railwayEnvironmentId, table.startedAt),
    index('infra_power_operations_status_idx').on(table.status),
  ],
);
