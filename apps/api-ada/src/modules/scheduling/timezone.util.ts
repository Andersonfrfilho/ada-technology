/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

const MILLISECONDS_IN_MINUTE = 60_000;

const PARTS_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
};

export type ZonedDay = {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly weekday: number;
};

/**
 * A hora que o relogio da parede marca naquele fuso, no instante dado.
 *
 * `Intl` e a unica fonte de fuso que ja existe no runtime — a alternativa e embarcar a base do IANA
 * junto com uma biblioteca de data, para responder o que o proprio `Intl` responde.
 */
function toZonedParts(params: { readonly instant: Date; readonly timezone: string }): number[] {
  const formatter = new Intl.DateTimeFormat('en-US', {
    ...PARTS_FORMAT,
    timeZone: params.timezone,
  });

  const parts = formatter.formatToParts(params.instant);
  const read = (type: string): number => Number(parts.find((part) => part.type === type)?.value);

  // `24` aparece na virada do dia em `hour12: false`; para a aritmetica ele e a meia-noite.
  const hour = read('hour') % 24;

  return [read('year'), read('month'), read('day'), hour, read('minute'), read('second')];
}

/** Quantos minutos o fuso esta a frente do UTC naquele instante — negativo no Brasil. */
export function zoneOffsetMinutes(params: { readonly instant: Date; readonly timezone: string }): number {
  const [year, month, day, hour, minute, second] = toZonedParts(params) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];

  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute, second);

  return (asIfUtc - Math.floor(params.instant.getTime() / 1000) * 1000) / MILLISECONDS_IN_MINUTE;
}

/**
 * O instante em que aquele relogio de parede acontece.
 *
 * Duas passadas porque o deslocamento depende do proprio instante que se quer descobrir: a primeira
 * chuta com o deslocamento do horario ingenuo, a segunda corrige quando o chute caiu do outro lado
 * de uma virada de horario de verao. Uma terceira nao muda mais nada.
 */
export function zonedTimeToUtc(params: {
  readonly day: Pick<ZonedDay, 'year' | 'month' | 'day'>;
  readonly minuteOfDay: number;
  readonly timezone: string;
}): Date {
  const { day, minuteOfDay, timezone } = params;
  const naive = Date.UTC(day.year, day.month - 1, day.day) + minuteOfDay * MILLISECONDS_IN_MINUTE;

  let instant = new Date(naive);

  for (let pass = 0; pass < 2; pass += 1) {
    const offset = zoneOffsetMinutes({ instant, timezone });
    instant = new Date(naive - offset * MILLISECONDS_IN_MINUTE);
  }

  return instant;
}

/** O dia do calendario daquele fuso, com o dia da semana no mesmo vocabulario do `Date.getDay()`. */
export function toZonedDay(params: { readonly instant: Date; readonly timezone: string }): ZonedDay {
  const [year, month, day] = toZonedParts(params) as [number, number, number];
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return { year, month, day, weekday };
}

/** O proximo dia do calendario, sem passar por fuso: somar 24h erraria na virada do verao. */
export function nextZonedDay(day: ZonedDay): ZonedDay {
  const shifted = new Date(Date.UTC(day.year, day.month - 1, day.day + 1));

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  };
}
