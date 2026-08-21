/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, test } from 'bun:test';

import { buildAvailableSlots } from '@/modules/scheduling/availability';
import type {
  BusyRange,
  ScheduleSettings,
  WeeklyRule,
} from '@/modules/scheduling/types/scheduling.types';

const ANA = 'a0000000-0000-4000-8000-000000000001';
const BRUNO = 'a0000000-0000-4000-8000-000000000002';

/** Sexta-feira, 8h da manha em Sao Paulo. */
const NOW = new Date('2026-08-21T11:00:00Z');

const SETTINGS: ScheduleSettings = {
  timezone: 'America/Sao_Paulo',
  slotMinutes: 60,
  minimumNoticeMinutes: 0,
  horizonDays: 1,
  isEnabled: true,
};

/** Sexta (5), das 9h as 12h. */
function workday(agentId: string, startHour = 9, endHour = 12): WeeklyRule {
  return { agentId, weekday: 5, startMinute: startHour * 60, endMinute: endHour * 60 };
}

function startsOf(agentIds: readonly string[], overrides: Partial<{
  rules: readonly WeeklyRule[];
  busy: readonly BusyRange[];
  settings: ScheduleSettings;
  now: Date;
}> = {}): readonly string[] {
  const slots = buildAvailableSlots({
    agentIds,
    rules: overrides.rules ?? [workday(ANA), workday(BRUNO)],
    busy: overrides.busy ?? [],
    settings: overrides.settings ?? SETTINGS,
    now: overrides.now ?? NOW,
  });

  return slots.map((slot) => slot.startsAt.toISOString());
}

describe('buildAvailableSlots', () => {
  test('quebra a faixa do dia na grade do slot', () => {
    expect(startsOf([ANA])).toEqual([
      '2026-08-21T12:00:00.000Z',
      '2026-08-21T13:00:00.000Z',
      '2026-08-21T14:00:00.000Z',
    ]);
  });

  /**
   * 9h-12h com slot de 45 minutos: o ultimo que cabe comeca 11h15 e fecha as 12h em ponto.
   *
   * A faixa 9h-11h30 para em 10h30 pelo mesmo motivo: o proximo fecharia meia hora depois do fim,
   * e o slot que transborda o expediente nunca e oferecido, mesmo que sobrem minutos.
   */
  test('nao oferece slot que passa do fim do expediente', () => {
    const settings = { ...SETTINGS, slotMinutes: 45 };

    expect(startsOf([ANA], { settings })).toEqual([
      '2026-08-21T12:00:00.000Z',
      '2026-08-21T12:45:00.000Z',
      '2026-08-21T13:30:00.000Z',
      '2026-08-21T14:15:00.000Z',
    ]);

    const untilHalfPastEleven: WeeklyRule = { ...workday(ANA), endMinute: 11 * 60 + 30 };
    expect(startsOf([ANA], { settings, rules: [untilHalfPastEleven] })).toEqual([
      '2026-08-21T12:00:00.000Z',
      '2026-08-21T12:45:00.000Z',
      '2026-08-21T13:30:00.000Z',
    ]);
  });

  test('com duas pessoas escolhidas sobra so o horario comum', () => {
    const rules = [workday(ANA, 9, 12), workday(BRUNO, 10, 11)];

    expect(startsOf([ANA, BRUNO], { rules })).toEqual(['2026-08-21T13:00:00.000Z']);
  });

  test('ocupacao de qualquer um dos escolhidos tira o horario da lista', () => {
    const busy: BusyRange[] = [
      {
        agentId: BRUNO,
        startsAt: new Date('2026-08-21T13:00:00Z'),
        endsAt: new Date('2026-08-21T14:00:00Z'),
      },
    ];

    expect(startsOf([ANA, BRUNO], { busy })).toEqual([
      '2026-08-21T12:00:00.000Z',
      '2026-08-21T14:00:00.000Z',
    ]);
  });

  /** Quem termina as 13h nao conflita com quem comeca as 13h. */
  test('encostar nao e sobrepor', () => {
    const busy: BusyRange[] = [
      {
        agentId: ANA,
        startsAt: new Date('2026-08-21T11:00:00Z'),
        endsAt: new Date('2026-08-21T12:00:00Z'),
      },
    ];

    expect(startsOf([ANA], { busy })).toContain('2026-08-21T12:00:00.000Z');
  });

  test('ocupacao de quem nao foi escolhido nao tira nada', () => {
    const busy: BusyRange[] = [
      {
        agentId: BRUNO,
        startsAt: new Date('2026-08-21T12:00:00Z'),
        endsAt: new Date('2026-08-21T15:00:00Z'),
      },
    ];

    expect(startsOf([ANA], { busy })).toHaveLength(3);
  });

  test('a antecedencia minima corta o comeco do dia', () => {
    const settings = { ...SETTINGS, minimumNoticeMinutes: 150 };

    expect(startsOf([ANA], { settings })).toEqual([
      '2026-08-21T14:00:00.000Z',
    ]);
  });

  test('agenda desligada nao oferece nada', () => {
    expect(startsOf([ANA], { settings: { ...SETTINGS, isEnabled: false } })).toEqual([]);
  });

  test('sem ninguem escolhido nao ha o que oferecer', () => {
    expect(startsOf([])).toEqual([]);
  });

  /** Sabado nao tem regra: o dia inteiro sai da lista sem ninguem precisar bloquear. */
  test('dia sem regra semanal nao aparece', () => {
    const saturday = new Date('2026-08-22T11:00:00Z');

    expect(startsOf([ANA], { now: saturday, settings: { ...SETTINGS, horizonDays: 0 } })).toEqual([]);
  });

  test('duas faixas no mesmo dia sao o intervalo do almoco', () => {
    const rules = [workday(ANA, 9, 11), workday(ANA, 13, 15)];

    expect(startsOf([ANA], { rules })).toEqual([
      '2026-08-21T12:00:00.000Z',
      '2026-08-21T13:00:00.000Z',
      '2026-08-21T16:00:00.000Z',
      '2026-08-21T17:00:00.000Z',
    ]);
  });
});
