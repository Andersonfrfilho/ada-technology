/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { INFRA_SCHEDULED_ACTION_KIND } from '@/modules/infra/infra.constant';
import infraLocale from '@/modules/infra/infra.locale.json';
import type { InfraNextScheduledAction } from '@/modules/infra/types/infra.types';
import { calendarDaysBetween, fillTemplate, formatZonedTime, getZonedParts } from '@/modules/infra/zonedTime.util';

const DAYS_TODAY = 0;
const DAYS_TOMORROW = 1;

/** "hoje às 20:00", "amanhã às 08:00" ou "seg 08:00", sempre no fuso America/Sao_Paulo. */
export function formatMoment({ at, now }: { readonly at: Date; readonly now: Date }): string {
  const time = formatZonedTime(at);
  const daysAhead = calendarDaysBetween({ from: now, to: at });

  if (daysAhead === DAYS_TODAY) return fillTemplate({ template: infraLocale.moment.today, values: { time } });
  if (daysAhead === DAYS_TOMORROW) return fillTemplate({ template: infraLocale.moment.tomorrow, values: { time } });

  const weekday = infraLocale.schedule.weekdayNames[getZonedParts(at).weekday] ?? '';

  return fillTemplate({ template: infraLocale.moment.weekday, values: { weekday, time } });
}

/** "Desliga hoje às 20:00", "Liga seg 08:00". */
export function formatNextScheduledAction({
  nextScheduledAction,
  now,
}: {
  readonly nextScheduledAction: InfraNextScheduledAction;
  readonly now: Date;
}): string {
  const verb =
    nextScheduledAction.kind === INFRA_SCHEDULED_ACTION_KIND.POWER_ON
      ? infraLocale.schedule.nextPowerOn
      : infraLocale.schedule.nextPowerOff;

  return `${verb} ${formatMoment({ at: new Date(nextScheduledAction.at), now })}`;
}
