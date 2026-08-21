/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type {
  AvailableSlot,
  BuildAvailableSlotsParams,
  BusyRange,
  WeeklyRule,
} from '@/modules/scheduling/types/scheduling.types';
import {
  nextZonedDay,
  toZonedDay,
  zonedTimeToUtc,
  type ZonedDay,
} from '@/modules/scheduling/timezone.util';

const MILLISECONDS_IN_MINUTE = 60_000;

/**
 * Os horarios que o cliente pode escolher.
 *
 * Funcao pura: recebe as regras, a ocupacao e o relogio, e devolve a lista. Disponibilidade e a
 * regra de negocio mais facil de errar em silencio do produto — oferecer um horario ocupado so
 * aparece quando o cliente ja marcou. Sendo pura, ela e testavel sem banco e sem esperar o dia
 * virar.
 *
 * Com mais de um atendente escolhido, o horario so entra quando esta livre para **todos**: quem
 * pediu para falar com duas pessoas quer as duas na mesma conversa.
 */
export function buildAvailableSlots(params: BuildAvailableSlotsParams): readonly AvailableSlot[] {
  const { agentIds, settings, now } = params;
  if (!settings.isEnabled || agentIds.length === 0) return [];

  const earliest = new Date(now.getTime() + settings.minimumNoticeMinutes * MILLISECONDS_IN_MINUTE);
  const horizonEnd = new Date(now.getTime() + settings.horizonDays * 24 * 60 * MILLISECONDS_IN_MINUTE);

  const slots: AvailableSlot[] = [];
  let day = toZonedDay({ instant: now, timezone: settings.timezone });

  for (let index = 0; index <= settings.horizonDays; index += 1) {
    slots.push(...slotsOfDay({ ...params, day, earliest, horizonEnd }));
    day = nextZonedDay(day);
  }

  return slots;
}

type DayParams = BuildAvailableSlotsParams & {
  readonly day: ZonedDay;
  readonly earliest: Date;
  readonly horizonEnd: Date;
};

function slotsOfDay(params: DayParams): readonly AvailableSlot[] {
  const { agentIds, rules, day, settings } = params;

  const shared = sharedMinutes({
    agentIds,
    rules,
    weekday: day.weekday,
    slotMinutes: settings.slotMinutes,
  });
  const slots: AvailableSlot[] = [];

  for (const minuteOfDay of shared) {
    const startsAt = zonedTimeToUtc({ day, minuteOfDay, timezone: settings.timezone });
    const endsAt = new Date(startsAt.getTime() + settings.slotMinutes * MILLISECONDS_IN_MINUTE);

    if (startsAt < params.earliest || startsAt > params.horizonEnd) continue;
    if (isBusy({ ...params, startsAt, endsAt })) continue;

    slots.push({ startsAt, endsAt });
  }

  return slots;
}

/**
 * Os minutos de inicio que cabem na regra de **todos** os atendentes escolhidos.
 *
 * A grade nasce do primeiro atendente e vai sendo podada pelos outros: com um so, e a agenda dele;
 * com tres, sobra o que os tres tem em comum — que costuma ser pouco, e e essa a informacao.
 */
function sharedMinutes(params: {
  readonly agentIds: readonly string[];
  readonly rules: readonly WeeklyRule[];
  readonly weekday: number;
  readonly slotMinutes: number;
}): readonly number[] {
  const { agentIds, rules, weekday, slotMinutes } = params;
  const ofDay = rules.filter((rule) => rule.weekday === weekday);

  const perAgent = agentIds.map(
    (agentId) =>
      new Set(
        ofDay
          .filter((rule) => rule.agentId === agentId)
          .flatMap((rule) => startMinutesOf({ rule, slotMinutes })),
      ),
  );

  const [first, ...rest] = perAgent;
  if (!first) return [];

  return [...first].filter((minute) => rest.every((other) => other.has(minute))).sort((a, b) => a - b);
}

/**
 * A grade da faixa, ancorada no inicio dela e sem transbordar o fim.
 *
 * Duas coisas que o passo de um minuto faria errado: ofereceria 9h01 e 9h02 como inicios distintos,
 * e deixaria a ultima conversa do dia terminar depois do expediente — a faixa 9h-18h com slot de 45
 * minutos acaba as 17h45, e o resto sobra.
 */
function startMinutesOf(params: {
  readonly rule: WeeklyRule;
  readonly slotMinutes: number;
}): readonly number[] {
  const { rule, slotMinutes } = params;
  const minutes: number[] = [];

  for (let minute = rule.startMinute; minute + slotMinutes <= rule.endMinute; minute += slotMinutes) {
    minutes.push(minute);
  }

  return minutes;
}

/** Sobreposicao de verdade: quem termina exatamente quando o outro comeca nao conflita. */
function isBusy(params: {
  readonly agentIds: readonly string[];
  readonly busy: readonly BusyRange[];
  readonly startsAt: Date;
  readonly endsAt: Date;
}): boolean {
  return params.busy.some(
    (range) =>
      params.agentIds.includes(range.agentId)
      && range.startsAt < params.endsAt
      && range.endsAt > params.startsAt,
  );
}
