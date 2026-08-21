/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export const SCHEDULE_PATH = '/v1/panel/schedule';
export const APPOINTMENTS_PATH = '/v1/panel/appointments';
export const AGENTS_PATH = '/v1/panel/agents';

export const SCHEDULE_QUERY_KEY = 'schedule';
export const APPOINTMENTS_QUERY_KEY = 'appointments';
export const AGENTS_QUERY_KEY = 'agents';

/** Domingo primeiro, como `Date.getDay()` — a mesma numeracao que a coluna `weekday` guarda. */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export const MINUTES_IN_HOUR = 60;

/**
 * A faixa que a tela sugere ao ligar um dia.
 *
 * Nao e regra de negocio: e o palpite que poupa dois campos de digitacao no caso mais comum, e que
 * o time corrige em cima.
 */
export const DEFAULT_WORKDAY = { startMinute: 9 * MINUTES_IN_HOUR, endMinute: 18 * MINUTES_IN_HOUR } as const;

/** Janela padrao da lista de agendamentos: o que ja foi e o que vem pela frente. */
export const APPOINTMENTS_WINDOW_DAYS = { past: 7, future: 30 } as const;
