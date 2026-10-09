/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { INFRA_SCHEDULE_ACTION } from '@/modules/infra/infra.constant';
import type {
  InfraScheduleAction,
  InfraScheduledTransition,
  InfraScheduleWindowInput,
  ResolveScheduleActionParams,
  ResolveScheduleActionResult,
} from '@/modules/infra/types/infra.types';

type ZonedParts = {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly minuteOfDay: number;
  readonly weekday: number;
};
type MinuteWindow = { readonly on: number; readonly off: number };

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MINUTES_PER_HOUR = 60;
const MS_PER_MINUTE = 60_000;
const NEXT_ACTION_SCAN_DAYS = 8;
const WEEKDAY_BY_NAME: Readonly<Record<string, number>> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function getZonedParts(params: { readonly date: Date; readonly timezone: string }): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: params.timezone,
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
  const values = new Map(formatter.formatToParts(params.date).map((part) => [part.type, part.value]));
  const read = (type: Intl.DateTimeFormatPartTypes): number => Number(values.get(type));
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    minuteOfDay: read('hour') * MINUTES_PER_HOUR + read('minute'),
    weekday: WEEKDAY_BY_NAME[values.get('weekday') ?? ''] ?? -1,
  };
}

function parseMinuteOfDay(time: string): number | undefined {
  const match = TIME_PATTERN.exec(time);
  if (match === null) return undefined;
  return Number(match[1]) * MINUTES_PER_HOUR + Number(match[2]);
}

// Janela inválida ou invertida vira vazia: a invariante é validada fora e aqui nunca lança.
function parseWindow(schedule: InfraScheduleWindowInput): MinuteWindow | undefined {
  const on = parseMinuteOfDay(schedule.powerOnTime);
  const off = parseMinuteOfDay(schedule.powerOffTime);
  if (on === undefined || off === undefined || on >= off) return undefined;
  return { on, off };
}

function isInsideWindow(params: {
  readonly parts: ZonedParts;
  readonly activeWeekdays: readonly number[];
  readonly window: MinuteWindow | undefined;
}): boolean {
  const { parts, activeWeekdays, window } = params;
  if (window === undefined || !activeWeekdays.includes(parts.weekday)) return false;
  return parts.minuteOfDay >= window.on && parts.minuteOfDay < window.off;
}

function zonedTimeToInstant(params: {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly minuteOfDay: number;
  readonly timezone: string;
}): Date {
  const { year, month, day, minuteOfDay, timezone } = params;
  const wallClockAsUtc = Date.UTC(year, month - 1, day, 0, minuteOfDay);
  const offsetAt = (instant: number): number => {
    const parts = getZonedParts({ date: new Date(instant), timezone });
    const zonedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, 0, parts.minuteOfDay);
    return zonedAsUtc - Math.floor(instant / MS_PER_MINUTE) * MS_PER_MINUTE;
  };
  // Segunda passada com o deslocamento do instante candidato cobre viradas de horário de verão.
  const firstGuess = wallClockAsUtc - offsetAt(wallClockAsUtc);
  return new Date(wallClockAsUtc - offsetAt(firstGuess));
}

function findNextTransition(params: {
  readonly schedule: InfraScheduleWindowInput;
  readonly window: MinuteWindow;
  readonly now: Date;
  readonly isInside: boolean;
}): InfraScheduledTransition | undefined {
  const { schedule, window, now, isInside } = params;
  const { timezone, keepOnUntil } = schedule;
  if (!isInside && keepOnUntil !== null && keepOnUntil > now) {
    return { kind: INFRA_SCHEDULE_ACTION.POWER_OFF, at: keepOnUntil };
  }
  const today = getZonedParts({ date: now, timezone });
  const kind = isInside ? INFRA_SCHEDULE_ACTION.POWER_OFF : INFRA_SCHEDULE_ACTION.POWER_ON;
  for (let offset = 0; offset < NEXT_ACTION_SCAN_DAYS; offset += 1) {
    if (!schedule.activeWeekdays.includes((today.weekday + offset) % 7)) continue;
    const calendarDay = new Date(Date.UTC(today.year, today.month - 1, today.day + offset));
    const at = zonedTimeToInstant({
      year: calendarDay.getUTCFullYear(),
      month: calendarDay.getUTCMonth() + 1,
      day: calendarDay.getUTCDate(),
      minuteOfDay: isInside ? window.off : window.on,
      timezone,
    });
    if (at > now) return { kind, at };
  }
  return undefined;
}

function decideAction(params: {
  readonly wasInside: boolean | undefined;
  readonly isInside: boolean;
  readonly isKeepOnActive: boolean;
  readonly isKeepOnExpired: boolean;
}): InfraScheduleAction {
  const { wasInside, isInside, isKeepOnActive, isKeepOnExpired } = params;
  if (wasInside === false && isInside) return INFRA_SCHEDULE_ACTION.POWER_ON;
  if (wasInside === true && !isInside) {
    return isKeepOnActive ? INFRA_SCHEDULE_ACTION.NONE : INFRA_SCHEDULE_ACTION.POWER_OFF;
  }
  if (!isInside && isKeepOnExpired) return INFRA_SCHEDULE_ACTION.POWER_OFF;
  return INFRA_SCHEDULE_ACTION.NONE;
}

export function resolveScheduleAction(params: ResolveScheduleActionParams): ResolveScheduleActionResult {
  const { schedule, now } = params;
  if (!schedule.isEnabled) {
    return { action: INFRA_SCHEDULE_ACTION.NONE, shouldClearKeepOn: false, nextScheduledAction: undefined };
  }
  const { activeWeekdays, timezone, keepOnUntil, lastEvaluatedAt } = schedule;
  const window = parseWindow(schedule);
  const isInsideAt = (date: Date): boolean =>
    isInsideWindow({ parts: getZonedParts({ date, timezone }), activeWeekdays, window });
  const isInside = isInsideAt(now);
  const isKeepOnExpired = keepOnUntil !== null && keepOnUntil <= now;
  // Só os lados de lastEvaluatedAt e now contam: uma lacuna longa age no máximo uma vez, mesmo cruzando vários limites.
  const action = decideAction({
    wasInside: lastEvaluatedAt === null ? undefined : isInsideAt(lastEvaluatedAt),
    isInside,
    isKeepOnActive: keepOnUntil !== null && keepOnUntil > now,
    isKeepOnExpired,
  });
  const nextScheduledAction =
    window === undefined ? undefined : findNextTransition({ schedule, window, now, isInside });
  return { action, shouldClearKeepOn: isKeepOnExpired, nextScheduledAction };
}
