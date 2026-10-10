/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const infraIntegrationSecrets = pgTable('infra_integration_secrets', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: varchar('provider', { length: 20 }).notNull().unique(),
  workspaceId: varchar('workspace_id', { length: 64 }).notNull(),
  ciphertext: text('ciphertext').notNull(),
  keyId: varchar('key_id', { length: 16 }).notNull(),
  tokenHint: varchar('token_hint', { length: 4 }).notNull(),
  updatedByAgentId: uuid('updated_by_agent_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
