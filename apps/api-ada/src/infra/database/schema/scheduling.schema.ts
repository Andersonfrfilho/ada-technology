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
  check,
  index,
  integer,
  pgTable,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { agents } from '@/infra/database/schema/agent.schema';
import {
  APPOINTMENT_STATUS,
  MINUTES_IN_DAY,
  SCHEDULE_SETTINGS_DEFAULT,
} from '@/modules/scheduling/scheduling.constant';

/**
 * Constante do codigo entra no DDL como literal, nunca como parametro ligado.
 *
 * `sql` interpolado vira `$1` no arquivo de migration, e migration nao recebe parametro: o
 * `CREATE INDEX ... WHERE status = $1` falha na hora de aplicar. `raw` aqui e seguro porque o valor
 * e uma constante deste repositorio — nada disto chega do cliente (`security.md` §5).
 */
const SCHEDULED = sql.raw(`'${APPOINTMENT_STATUS.SCHEDULED}'`);
const DAY_MINUTES = sql.raw(String(MINUTES_IN_DAY));

/**
 * Linha unica: a configuracao da agenda que a tela edita.
 *
 * Duracao e janela vivem aqui, e nao em constante, porque quem muda o horario de atendimento e o
 * time — nao o deploy.
 */
export const scheduleSettings = pgTable('schedule_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  timezone: varchar('timezone', { length: 60 })
    .notNull()
    .default(SCHEDULE_SETTINGS_DEFAULT.timezone),
  slotMinutes: integer('slot_minutes').notNull().default(SCHEDULE_SETTINGS_DEFAULT.slotMinutes),
  minimumNoticeMinutes: integer('minimum_notice_minutes')
    .notNull()
    .default(SCHEDULE_SETTINGS_DEFAULT.minimumNoticeMinutes),
  horizonDays: integer('horizon_days').notNull().default(SCHEDULE_SETTINGS_DEFAULT.horizonDays),
  isEnabled: boolean('is_enabled').notNull().default(SCHEDULE_SETTINGS_DEFAULT.isEnabled),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A regra semanal de cada atendente, em minutos desde a meia-noite do fuso configurado.
 *
 * Minuto inteiro em vez de `time`: o calculo de slot e aritmetica, e converter texto de hora a cada
 * iteracao seria trabalho por linha. Duas faixas no mesmo dia sao duas linhas — e assim que o
 * intervalo do almoco existe, sem coluna de pausa.
 */
export const agentSchedules = pgTable(
  'agent_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    // 0 e domingo, como `Date.getDay()`.
    weekday: smallint('weekday').notNull(),
    startMinute: integer('start_minute').notNull(),
    endMinute: integer('end_minute').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('agent_schedules_agent_weekday_idx').on(table.agentId, table.weekday),
    // Faixa invertida ou fora do dia nao e dado ruim de tela: e slot que nunca aparece e ninguem
    // entende por que. O banco recusa.
    check(
      'agent_schedules_range_check',
      sql`${table.startMinute} >= 0 and ${table.endMinute} <= ${DAY_MINUTES} and ${table.startMinute} < ${table.endMinute}`,
    ),
  ],
);

/** Bloqueio pontual: ferias, feriado, compromisso que nao esta em nenhuma agenda externa. */
export const agentTimeOff = pgTable(
  'agent_time_off',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    reason: varchar('reason', { length: 200 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('agent_time_off_agent_range_idx').on(table.agentId, table.startsAt)],
);

/**
 * A reserva.
 *
 * Guarda `session_id` e nao o nome nem o telefone: quem quer saber com quem e a conversa abre a
 * conversa. Dado pessoal duplicado em tabela nova e dado pessoal que ninguem lembra de apagar.
 */
export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Sem FK, pelo mesmo motivo de `leads.session_id`: aquele schema pertence ao modulo.
    sessionId: uuid('session_id').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default(APPOINTMENT_STATUS.SCHEDULED),
    sourceChannel: varchar('source_channel', { length: 20 }).notNull(),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('appointments_starts_status_idx').on(table.startsAt, table.status),
    // Retentativa do cliente (rede caiu, ele tocou de novo) nao vira duas reservas.
    uniqueIndex('appointments_session_start_unique')
      .on(table.sessionId, table.startsAt)
      .where(sql`${table.status} = ${SCHEDULED}`),
  ],
);

/**
 * Quem atende — e a garantia contra duplo-booking.
 *
 * O unico parcial e a exclusao mutua de verdade: dois clientes clicando no mesmo horario no mesmo
 * segundo produzem um erro de constraint, e nao duas reservas. `SELECT` antes de `INSERT` nao
 * segura nada — entre a leitura e a escrita cabe a outra transacao inteira.
 */
export const appointmentAgents = pgTable(
  'appointment_agents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default(APPOINTMENT_STATUS.SCHEDULED),
  },
  (table) => [
    index('appointment_agents_agent_starts_idx').on(table.agentId, table.startsAt),
    uniqueIndex('appointment_agents_slot_unique')
      .on(table.agentId, table.startsAt)
      .where(sql`${table.status} = ${SCHEDULED}`),
  ],
);
