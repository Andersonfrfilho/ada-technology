/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, test } from 'bun:test';

import {
  nextZonedDay,
  toZonedDay,
  zonedTimeToUtc,
  zoneOffsetMinutes,
} from '@/modules/scheduling/timezone.util';

const SAO_PAULO = 'America/Sao_Paulo';

describe('timezone.util', () => {
  test('Sao Paulo esta tres horas atras do UTC', () => {
    const offset = zoneOffsetMinutes({ instant: new Date('2026-08-21T12:00:00Z'), timezone: SAO_PAULO });

    expect(offset).toBe(-180);
  });

  test('nove da manha em Sao Paulo e meio-dia em UTC', () => {
    const instant = zonedTimeToUtc({
      day: { year: 2026, month: 8, day: 21 },
      minuteOfDay: 9 * 60,
      timezone: SAO_PAULO,
    });

    expect(instant.toISOString()).toBe('2026-08-21T12:00:00.000Z');
  });

  /** Fuso com horario de verao ativo: o slot das 9h continua sendo 9h para quem marcou. */
  test('respeita a virada de horario de verao onde ela existe', () => {
    const winter = zonedTimeToUtc({
      day: { year: 2026, month: 1, day: 15 },
      minuteOfDay: 9 * 60,
      timezone: 'Europe/Lisbon',
    });
    const summer = zonedTimeToUtc({
      day: { year: 2026, month: 7, day: 15 },
      minuteOfDay: 9 * 60,
      timezone: 'Europe/Lisbon',
    });

    expect(winter.toISOString()).toBe('2026-01-15T09:00:00.000Z');
    expect(summer.toISOString()).toBe('2026-07-15T08:00:00.000Z');
  });

  /** Meia-noite e meia em Londres ainda e o dia anterior em Sao Paulo — e o dia errado marca errado. */
  test('o dia do calendario e o do fuso, nao o do UTC', () => {
    const day = toZonedDay({ instant: new Date('2026-08-22T02:00:00Z'), timezone: SAO_PAULO });

    expect(day).toEqual({ year: 2026, month: 8, day: 21, weekday: 5 });
  });

  test('avanca o dia virando o mes', () => {
    expect(nextZonedDay({ year: 2026, month: 8, day: 31, weekday: 1 })).toEqual({
      year: 2026,
      month: 9,
      day: 1,
      weekday: 2,
    });
  });
});
