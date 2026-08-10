/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { knowledgeItems } from '@/infra/database/schema/knowledge.schema';
import { LEAD_STATUS } from '@/shared/constants/domain.constant';

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Aponta para meta_whatsapp.sessions sem FK: aquele schema pertence ao modulo, que apaga
    // conversa pelo proprio use-case. Uma FK daqui travaria a exclusao ou seria gerida por
    // duas migrations rivais.
    sessionId: uuid('session_id').notNull(),
    name: varchar('name', { length: 160 }),
    email: varchar('email', { length: 200 }),
    phone: varchar('phone', { length: 30 }),
    companyName: varchar('company_name', { length: 200 }),
    interestItemId: uuid('interest_item_id').references(() => knowledgeItems.id, {
      onDelete: 'set null',
    }),
    notes: text('notes'),
    status: varchar('status', { length: 20 }).notNull().default(LEAD_STATUS.NEW),
    sourceChannel: varchar('source_channel', { length: 20 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('leads_status_created_idx').on(table.status, table.createdAt),
    index('leads_session_idx').on(table.sessionId),
    index('leads_interest_item_idx').on(table.interestItemId),
  ],
);
