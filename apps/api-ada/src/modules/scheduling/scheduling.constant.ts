/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  CANCELED: 'canceled',
  COMPLETED: 'completed',
} as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];

export const MINUTES_IN_DAY = 24 * 60;

/**
 * O que a tela de configuracao mostra enquanto ninguem salvou nada.
 *
 * Fica em codigo porque a linha de `schedule_settings` so nasce no primeiro save, e uma agenda sem
 * configuracao nao pode significar "atende a qualquer hora": significa o horario comercial daqui.
 * Nasce desligada de proposito — o bot so oferece horario depois de alguem declarar a agenda.
 */
export const SCHEDULE_SETTINGS_DEFAULT = {
  timezone: 'America/Sao_Paulo',
  slotMinutes: 30,
  /** Ninguem marca para daqui a cinco minutos: o atendente precisa ver que chegou. */
  minimumNoticeMinutes: 120,
  horizonDays: 30,
  isEnabled: false,
} as const;

export const SCHEDULE_SETTINGS_LIMIT = {
  SLOT_MINUTES: { min: 10, max: 240 },
  MINIMUM_NOTICE_MINUTES: { min: 0, max: MINUTES_IN_DAY * 7 },
  HORIZON_DAYS: { min: 1, max: 180 },
} as const;
