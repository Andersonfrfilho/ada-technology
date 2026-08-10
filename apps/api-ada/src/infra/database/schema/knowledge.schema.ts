/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const knowledgeCategories = pgTable(
  'knowledge_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 120 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    description: text('description'),
    position: integer('position').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('knowledge_categories_slug_unique').on(table.slug)],
);

export const knowledgeItems = pgTable(
  'knowledge_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => knowledgeCategories.id, { onDelete: 'restrict' }),
    slug: varchar('slug', { length: 120 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    summary: text('summary').notNull(),
    content: text('content').notNull(),
    /** Termos alternativos que o cliente usa ("bot de whats", "chatbot"). */
    aliases: text('aliases')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    highlights: jsonb('highlights').notNull().default(sql`'[]'::jsonb`),
    priceFromAmount: numeric('price_from_amount', { precision: 12, scale: 2 }),
    priceFromCurrency: varchar('price_from_currency', { length: 3 }).notNull().default('BRL'),
    ctaLabel: varchar('cta_label', { length: 120 }),
    ctaUrl: varchar('cta_url', { length: 500 }),
    position: integer('position').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('knowledge_items_slug_unique').on(table.slug),
    index('knowledge_items_category_idx').on(table.categoryId),
    index('knowledge_items_active_position_idx').on(table.isActive, table.position),
  ],
);

export const knowledgeFaqs = pgTable(
  'knowledge_faqs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    itemId: uuid('item_id').references(() => knowledgeItems.id, { onDelete: 'cascade' }),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    position: integer('position').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('knowledge_faqs_item_idx').on(table.itemId)],
);
