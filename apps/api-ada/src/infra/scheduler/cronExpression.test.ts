/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, test } from 'bun:test';

import { matchesCronExpression, parseCronExpression } from '@/infra/scheduler/cronExpression';

function at(text: string): Date {
  return new Date(text);
}

describe('matchesCronExpression', () => {
  test('o intervalo do catalogo casa de cinco em cinco minutos', () => {
    const expression = '*/5 * * * *';

    expect(matchesCronExpression({ expression, date: at('2026-08-13T10:05:00') })).toBe(true);
    expect(matchesCronExpression({ expression, date: at('2026-08-13T10:07:00') })).toBe(false);
  });

  test('campo fixo so casa no valor exato', () => {
    const expression = '30 3 * * *';

    expect(matchesCronExpression({ expression, date: at('2026-08-13T03:30:00') })).toBe(true);
    expect(matchesCronExpression({ expression, date: at('2026-08-13T04:30:00') })).toBe(false);
  });

  test('lista e intervalo convivem no mesmo campo', () => {
    const expression = '0 9-11,15 * * *';

    expect(matchesCronExpression({ expression, date: at('2026-08-13T10:00:00') })).toBe(true);
    expect(matchesCronExpression({ expression, date: at('2026-08-13T15:00:00') })).toBe(true);
    expect(matchesCronExpression({ expression, date: at('2026-08-13T12:00:00') })).toBe(false);
  });

  test('domingo e zero, como o Date devolve', () => {
    const expression = '0 8 * * 0';

    expect(matchesCronExpression({ expression, date: at('2026-08-16T08:00:00') })).toBe(true);
    expect(matchesCronExpression({ expression, date: at('2026-08-17T08:00:00') })).toBe(false);
  });
});

describe('parseCronExpression', () => {
  test('expressao com numero de campos errado falha, em vez de nunca disparar', () => {
    expect(() => parseCronExpression('*/5 * *')).toThrow(/5 campos/);
  });

  test('valor fora da faixa do campo falha no boot', () => {
    expect(() => parseCronExpression('0 25 * * *')).toThrow(/invalida/);
  });

  test('passo zero falha, em vez de virar laco infinito', () => {
    expect(() => parseCronExpression('*/0 * * * *')).toThrow(/passo/);
  });
});
