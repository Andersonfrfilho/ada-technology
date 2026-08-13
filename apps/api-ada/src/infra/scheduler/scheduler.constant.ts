/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export const SCHEDULER_SOURCE = 'scheduler';

/** Resolucao do relogio: cron so distingue minuto, entao acordar mais vezes seria trabalho a toa. */
export const SCHEDULER_TICK_MS = 60_000;

export const CRON_FIELD_COUNT = 5;

export const CRON_FIELD_RANGE = {
  MINUTE: { min: 0, max: 59 },
  HOUR: { min: 0, max: 23 },
  DAY_OF_MONTH: { min: 1, max: 31 },
  MONTH: { min: 1, max: 12 },
  // 0 e 7 sao domingo no cron; aqui so 0 e aceito, que e o que o `Date.getDay()` devolve.
  DAY_OF_WEEK: { min: 0, max: 6 },
} as const;
