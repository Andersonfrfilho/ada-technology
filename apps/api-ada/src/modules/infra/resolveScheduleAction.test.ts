/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { INFRA_SCHEDULE_ACTION } from '@/modules/infra/infra.constant';
import { isInsideScheduleWindow, resolveScheduleAction } from '@/modules/infra/resolveScheduleAction';
import type { InfraScheduleWindowInput } from '@/modules/infra/types/infra.types';

// Outubro/2026: 09 sexta, 10 sábado, 11 domingo, 12 segunda, 14 quarta. BRT = UTC-3.
function brt(day: number, hour: number, minute: number): Date {
  return new Date(Date.UTC(2026, 9, day, hour + 3, minute));
}

const BUSINESS_HOURS: InfraScheduleWindowInput = {
  activeWeekdays: [1, 2, 3, 4, 5],
  powerOnTime: '08:00',
  powerOffTime: '20:00',
  timezone: 'America/Sao_Paulo',
  isEnabled: true,
  keepOnUntil: null,
  lastEvaluatedAt: null,
};

function resolve(schedule: Partial<InfraScheduleWindowInput>, now: Date) {
  return resolveScheduleAction({ schedule: { ...BUSINESS_HOURS, ...schedule }, now });
}

describe('resolveScheduleAction - transições', () => {
  it('entra na janela às 08:00 -> power_on', () => {
    const result = resolve({ lastEvaluatedAt: brt(14, 7, 59) }, brt(14, 8, 0));
    expect(result.action).toBe(INFRA_SCHEDULE_ACTION.POWER_ON);
    expect(result.shouldClearKeepOn).toBe(false);
  });

  it('sai da janela às 20:00 -> power_off', () => {
    const result = resolve({ lastEvaluatedAt: brt(14, 19, 59) }, brt(14, 20, 0));
    expect(result.action).toBe(INFRA_SCHEDULE_ACTION.POWER_OFF);
  });

  it('dentro da janela sem transição -> none (ação manual não é desfeita)', () => {
    const result = resolve({ lastEvaluatedAt: brt(14, 10, 0) }, brt(14, 10, 1));
    expect(result.action).toBe(INFRA_SCHEDULE_ACTION.NONE);
  });

  it('fim de semana no horário -> none', () => {
    expect(resolve({ lastEvaluatedAt: brt(10, 7, 59) }, brt(10, 8, 0)).action).toBe(INFRA_SCHEDULE_ACTION.NONE);
    expect(resolve({ lastEvaluatedAt: brt(11, 19, 59) }, brt(11, 20, 0)).action).toBe(INFRA_SCHEDULE_ACTION.NONE);
  });

  it('borda de dia não ativo: sexta 20:00 -> power_off; sábado 08:00 -> none', () => {
    expect(resolve({ lastEvaluatedAt: brt(9, 19, 59) }, brt(9, 20, 0)).action).toBe(INFRA_SCHEDULE_ACTION.POWER_OFF);
    expect(resolve({ lastEvaluatedAt: brt(10, 7, 59) }, brt(10, 8, 0)).action).toBe(INFRA_SCHEDULE_ACTION.NONE);
  });

  it('primeira avaliação (lastEvaluatedAt null) -> none', () => {
    expect(resolve({ lastEvaluatedAt: null }, brt(14, 10, 0)).action).toBe(INFRA_SCHEDULE_ACTION.NONE);
    expect(resolve({ lastEvaluatedAt: null }, brt(14, 21, 0)).action).toBe(INFRA_SCHEDULE_ACTION.NONE);
  });

  it('agenda pausada -> none e next undefined', () => {
    const result = resolve({ isEnabled: false, lastEvaluatedAt: brt(14, 19, 59) }, brt(14, 20, 0));
    expect(result.action).toBe(INFRA_SCHEDULE_ACTION.NONE);
    expect(result.shouldClearKeepOn).toBe(false);
    expect(result.nextScheduledAction).toBeUndefined();
  });

  it('API fora do ar atravessando 20:00 (18:30 -> 21:30) -> power_off uma vez', () => {
    const result = resolve({ lastEvaluatedAt: brt(14, 18, 30) }, brt(14, 21, 30));
    expect(result.action).toBe(INFRA_SCHEDULE_ACTION.POWER_OFF);
  });

  it('lacuna atravessando 08:00 (07:00 -> 08:00) -> power_on', () => {
    const result = resolve({ lastEvaluatedAt: brt(14, 7, 0) }, brt(14, 8, 0));
    expect(result.action).toBe(INFRA_SCHEDULE_ACTION.POWER_ON);
  });

  it('é idempotente para os mesmos argumentos', () => {
    const schedule = { lastEvaluatedAt: brt(14, 19, 59) };
    expect(resolve(schedule, brt(14, 20, 0))).toEqual(resolve(schedule, brt(14, 20, 0)));
  });
});

describe('resolveScheduleAction - keepOnUntil', () => {
  it('saída às 20:00 com keepOnUntil 22:00 -> none', () => {
    const result = resolve({ lastEvaluatedAt: brt(14, 19, 59), keepOnUntil: brt(14, 22, 0) }, brt(14, 20, 0));
    expect(result.action).toBe(INFRA_SCHEDULE_ACTION.NONE);
    expect(result.shouldClearKeepOn).toBe(false);
  });

  it('às 22:01 sem transição, exceção vencida -> power_off + clear', () => {
    const result = resolve({ lastEvaluatedAt: brt(14, 22, 0), keepOnUntil: brt(14, 22, 0) }, brt(14, 22, 1));
    expect(result.action).toBe(INFRA_SCHEDULE_ACTION.POWER_OFF);
    expect(result.shouldClearKeepOn).toBe(true);
  });

  it('keepOnUntil vencido dentro da janela -> none + clear', () => {
    const result = resolve({ lastEvaluatedAt: brt(14, 10, 0), keepOnUntil: brt(14, 9, 0) }, brt(14, 10, 1));
    expect(result.action).toBe(INFRA_SCHEDULE_ACTION.NONE);
    expect(result.shouldClearKeepOn).toBe(true);
  });

  it('keepOnUntil vencido com transição power_off -> power_off + clear', () => {
    const result = resolve({ lastEvaluatedAt: brt(14, 19, 59), keepOnUntil: brt(14, 19, 0) }, brt(14, 20, 0));
    expect(result.action).toBe(INFRA_SCHEDULE_ACTION.POWER_OFF);
    expect(result.shouldClearKeepOn).toBe(true);
  });

  it('keepOnUntil vencido com transição power_on -> power_on + clear', () => {
    const result = resolve({ lastEvaluatedAt: brt(14, 7, 59), keepOnUntil: brt(14, 7, 0) }, brt(14, 8, 0));
    expect(result.action).toBe(INFRA_SCHEDULE_ACTION.POWER_ON);
    expect(result.shouldClearKeepOn).toBe(true);
  });

  it('primeira avaliação com keepOnUntil vencido fora da janela -> power_off + clear', () => {
    const result = resolve({ lastEvaluatedAt: null, keepOnUntil: brt(14, 21, 0) }, brt(14, 22, 0));
    expect(result.action).toBe(INFRA_SCHEDULE_ACTION.POWER_OFF);
    expect(result.shouldClearKeepOn).toBe(true);
  });
});

describe('resolveScheduleAction - nextScheduledAction', () => {
  it('sexta 20:30 -> power_on segunda 08:00 (11:00Z)', () => {
    const result = resolve({ lastEvaluatedAt: brt(9, 20, 29) }, brt(9, 20, 30));
    expect(result.nextScheduledAction?.kind).toBe(INFRA_SCHEDULE_ACTION.POWER_ON);
    expect(result.nextScheduledAction?.at.toISOString()).toBe('2026-10-12T11:00:00.000Z');
  });

  it('quarta 10:00 -> power_off quarta 20:00', () => {
    const result = resolve({ lastEvaluatedAt: brt(14, 9, 59) }, brt(14, 10, 0));
    expect(result.nextScheduledAction?.kind).toBe(INFRA_SCHEDULE_ACTION.POWER_OFF);
    expect(result.nextScheduledAction?.at.toISOString()).toBe('2026-10-14T23:00:00.000Z');
  });

  it('quarta 07:00 -> power_on quarta 08:00', () => {
    const result = resolve({}, brt(14, 7, 0));
    expect(result.nextScheduledAction?.at.toISOString()).toBe('2026-10-14T11:00:00.000Z');
  });

  it('sábado 12:00 -> power_on segunda 08:00', () => {
    const result = resolve({}, brt(10, 12, 0));
    expect(result.nextScheduledAction?.kind).toBe(INFRA_SCHEDULE_ACTION.POWER_ON);
    expect(result.nextScheduledAction?.at.toISOString()).toBe('2026-10-12T11:00:00.000Z');
  });

  it('sem dias ativos -> undefined', () => {
    expect(resolve({ activeWeekdays: [] }, brt(14, 10, 0)).nextScheduledAction).toBeUndefined();
  });

  it('keepOnUntil futuro fora da janela -> power_off em keepOnUntil', () => {
    const keepOnUntil = brt(14, 22, 0);
    const result = resolve({ keepOnUntil }, brt(14, 21, 0));
    expect(result.nextScheduledAction?.kind).toBe(INFRA_SCHEDULE_ACTION.POWER_OFF);
    expect(result.nextScheduledAction?.at.getTime()).toBe(keepOnUntil.getTime());
  });
});

describe('resolveScheduleAction - fusos e entradas inválidas', () => {
  it('UTC: entra às 08:00Z', () => {
    const result = resolve(
      { timezone: 'UTC', lastEvaluatedAt: new Date('2026-10-14T07:59:00Z') },
      new Date('2026-10-14T08:00:00Z'),
    );
    expect(result.action).toBe(INFRA_SCHEDULE_ACTION.POWER_ON);
    expect(result.nextScheduledAction?.at.toISOString()).toBe('2026-10-14T20:00:00.000Z');
  });

  it('America/New_York (UTC-4 em outubro): 08:00 local = 12:00Z', () => {
    const result = resolve(
      { timezone: 'America/New_York', lastEvaluatedAt: new Date('2026-10-14T11:59:00Z') },
      new Date('2026-10-14T12:00:00Z'),
    );
    expect(result.action).toBe(INFRA_SCHEDULE_ACTION.POWER_ON);
    expect(result.nextScheduledAction?.at.toISOString()).toBe('2026-10-15T00:00:00.000Z');
  });

  it('New_York em novembro (UTC-5, pós horário de verão): 08:00 local = 13:00Z', () => {
    const result = resolve({ timezone: 'America/New_York' }, new Date('2026-11-17T12:00:00Z'));
    expect(result.nextScheduledAction?.at.toISOString()).toBe('2026-11-17T13:00:00.000Z');
  });

  it('janela invertida (on >= off) -> janela vazia, sem lançar', () => {
    const result = resolve(
      { powerOnTime: '20:00', powerOffTime: '08:00', lastEvaluatedAt: brt(14, 7, 59) },
      brt(14, 8, 0),
    );
    expect(result.action).toBe(INFRA_SCHEDULE_ACTION.NONE);
    expect(result.nextScheduledAction).toBeUndefined();
  });

  it('hora inválida -> janela vazia, sem lançar', () => {
    const result = resolve({ powerOnTime: 'xx:yy', lastEvaluatedAt: brt(14, 7, 59) }, brt(14, 8, 0));
    expect(result.action).toBe(INFRA_SCHEDULE_ACTION.NONE);
    expect(result.nextScheduledAction).toBeUndefined();
  });
});

describe('isInsideScheduleWindow', () => {
  const inside = (at: Date, schedule: Partial<InfraScheduleWindowInput> = {}): boolean =>
    isInsideScheduleWindow({ schedule: { ...BUSINESS_HOURS, ...schedule }, at });

  it('true dentro da janela e em dia ativo', () => {
    expect(inside(brt(14, 10, 0))).toBe(true);
  });

  it('limite inferior inclusivo e superior exclusivo', () => {
    expect(inside(brt(14, 8, 0))).toBe(true);
    expect(inside(brt(14, 20, 0))).toBe(false);
  });

  it('false fora do horario e em dia inativo', () => {
    expect(inside(brt(14, 7, 59))).toBe(false);
    expect(inside(brt(10, 10, 0))).toBe(false);
  });

  it('false para janela invalida', () => {
    expect(inside(brt(14, 10, 0), { powerOnTime: '20:00', powerOffTime: '08:00' })).toBe(false);
  });
});
