/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { MINUTES_IN_HOUR } from '@/modules/schedule/schedule.constant';

const PAD_LENGTH = 2;

/** O `<input type="time">` fala `HH:MM`; a coluna guarda minuto desde a meia-noite. */
export function toTimeValue(minute: number): string {
  const hours = Math.floor(minute / MINUTES_IN_HOUR);
  const minutes = minute % MINUTES_IN_HOUR;

  return `${String(hours).padStart(PAD_LENGTH, '0')}:${String(minutes).padStart(PAD_LENGTH, '0')}`;
}

/** Campo de hora limpo devolve string vazia, e `Number('')` e zero — daí a checagem explícita. */
export function toMinuteOfDay(value: string): number | undefined {
  const [hours, minutes] = value.split(':');
  if (hours === undefined || minutes === undefined) return undefined;

  const total = Number(hours) * MINUTES_IN_HOUR + Number(minutes);

  return Number.isFinite(total) ? total : undefined;
}
