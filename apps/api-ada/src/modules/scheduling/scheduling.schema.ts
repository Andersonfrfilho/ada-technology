/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { z } from 'zod';

import {
  MINUTES_IN_DAY,
  SCHEDULE_SETTINGS_LIMIT,
} from '@/modules/scheduling/scheduling.constant';

const DAYS_IN_WEEK = 6;
const TIMEZONE_MAX_LENGTH = 60;

/**
 * Fuso e validado pelo proprio runtime, nao por lista nossa.
 *
 * `Intl` recusa o que ele nao sabe converter, e e ele quem faz a conta de horario de verao mais
 * adiante: aceitar aqui o que ele rejeita la produziria agenda que nao gera horario nenhum.
 */
const timezoneSchema = z
  .string()
  .max(TIMEZONE_MAX_LENGTH)
  .refine(isSupportedTimezone, { message: 'Fuso horario desconhecido' });

const settingsSchema = z.object({
  timezone: timezoneSchema,
  slotMinutes: z
    .number()
    .int()
    .min(SCHEDULE_SETTINGS_LIMIT.SLOT_MINUTES.min)
    .max(SCHEDULE_SETTINGS_LIMIT.SLOT_MINUTES.max),
  minimumNoticeMinutes: z
    .number()
    .int()
    .min(SCHEDULE_SETTINGS_LIMIT.MINIMUM_NOTICE_MINUTES.min)
    .max(SCHEDULE_SETTINGS_LIMIT.MINIMUM_NOTICE_MINUTES.max),
  horizonDays: z
    .number()
    .int()
    .min(SCHEDULE_SETTINGS_LIMIT.HORIZON_DAYS.min)
    .max(SCHEDULE_SETTINGS_LIMIT.HORIZON_DAYS.max),
  isEnabled: z.boolean(),
});

/** A mesma regra do CHECK da tabela: faixa invertida vira slot que nunca aparece. */
const ruleSchema = z
  .object({
    agentId: z.string().uuid(),
    weekday: z.number().int().min(0).max(DAYS_IN_WEEK),
    startMinute: z.number().int().min(0).max(MINUTES_IN_DAY),
    endMinute: z.number().int().min(0).max(MINUTES_IN_DAY),
  })
  .refine((rule) => rule.startMinute < rule.endMinute, {
    message: 'O fim da faixa precisa ser depois do inicio',
  });

export const saveScheduleSchema = z.object({
  settings: settingsSchema,
  rules: z.array(ruleSchema),
});

/** Lista separada por virgula, como o resto do painel ja manda selecao multipla. */
export const availableSlotsQuerySchema = z.object({
  agentId: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.split(',').filter((item) => item.length > 0))
    .pipe(z.array(z.string().uuid()).min(1)),
});

export const appointmentsQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  agentId: z.string().uuid().optional(),
});

export const appointmentIdSchema = z.string().uuid();

function isSupportedTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
