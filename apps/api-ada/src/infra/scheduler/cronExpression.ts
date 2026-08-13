/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { CRON_FIELD_RANGE, CRON_FIELD_COUNT } from '@/infra/scheduler/scheduler.constant';

type CronField = {
  readonly min: number;
  readonly max: number;
};

const FIELD_RANGES: readonly CronField[] = [
  CRON_FIELD_RANGE.MINUTE,
  CRON_FIELD_RANGE.HOUR,
  CRON_FIELD_RANGE.DAY_OF_MONTH,
  CRON_FIELD_RANGE.MONTH,
  CRON_FIELD_RANGE.DAY_OF_WEEK,
];

/**
 * Casa uma expressao cron de cinco campos com um instante, na resolucao de minuto.
 *
 * Nao ha biblioteca aqui de proposito: os modulos declaram intervalo simples (`*​/5 * * * *`), e
 * uma dependencia de cron traria parser de fuso, calendario e "ultimo dia util" que ninguem usa.
 * O que nao for suportado falha no boot, alto e claro, em vez de nunca disparar em silencio.
 */
export function matchesCronExpression(params: {
  readonly expression: string;
  readonly date: Date;
}): boolean {
  const fields = parseCronExpression(params.expression);
  const { date } = params;

  const values = [
    date.getMinutes(),
    date.getHours(),
    date.getDate(),
    date.getMonth() + 1,
    date.getDay(),
  ];

  return fields.every((allowed, index) => allowed.has(values[index] as number));
}

/**
 * Erro de configuracao, nao de dominio: expressao invalida vem do codigo do host ou do modulo, e
 * a unica resposta util e derrubar o boot antes de a API aceitar trafego.
 */
export function parseCronExpression(expression: string): readonly ReadonlySet<number>[] {
  const parts = expression.trim().split(/\s+/);

  if (parts.length !== CRON_FIELD_COUNT) {
    throw new Error(`Expressao cron invalida: "${expression}" — sao esperados ${CRON_FIELD_COUNT} campos`);
  }

  return parts.map((part, index) => parseField({ part, range: FIELD_RANGES[index] as CronField, expression }));
}

function parseField(params: {
  readonly part: string;
  readonly range: CronField;
  readonly expression: string;
}): ReadonlySet<number> {
  const { part, range, expression } = params;
  const values = new Set<number>();

  for (const item of part.split(',')) {
    const [pattern, stepText] = item.split('/');
    const step = stepText === undefined ? 1 : Number(stepText);

    if (!Number.isInteger(step) || step < 1) {
      throw new Error(`Expressao cron invalida: passo "${stepText}" em "${expression}"`);
    }

    const [from, to] = parseRange({ pattern: pattern ?? '', range, expression });

    for (let value = from; value <= to; value += step) values.add(value);
  }

  return values;
}

function parseRange(params: {
  readonly pattern: string;
  readonly range: CronField;
  readonly expression: string;
}): readonly [number, number] {
  const { pattern, range, expression } = params;

  if (pattern === '*') return [range.min, range.max];

  const bounds = pattern.split('-').map(Number);
  const from = bounds[0];
  const to = bounds.length === 1 ? from : bounds[1];

  if (
    from === undefined ||
    to === undefined ||
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < range.min ||
    to > range.max ||
    from > to
  ) {
    throw new Error(`Expressao cron invalida: campo "${pattern}" em "${expression}"`);
  }

  return [from, to];
}
