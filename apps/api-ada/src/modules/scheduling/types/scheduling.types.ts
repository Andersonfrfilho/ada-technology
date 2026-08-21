/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export type ScheduleSettings = {
  readonly timezone: string;
  readonly slotMinutes: number;
  readonly minimumNoticeMinutes: number;
  readonly horizonDays: number;
  readonly isEnabled: boolean;
};

/** A faixa de atendimento de um dia da semana, em minutos desde a meia-noite do fuso. */
export type WeeklyRule = {
  readonly agentId: string;
  readonly weekday: number;
  readonly startMinute: number;
  readonly endMinute: number;
};

/**
 * Um pedaco de tempo em que o atendente nao pode receber ninguem.
 *
 * Vem de tres origens que o calculo nao distingue de proposito: bloqueio manual, agendamento ja
 * feito, e a agenda externa da pessoa. Somar origem nova nao muda uma linha daqui.
 */
export type BusyRange = {
  readonly agentId: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
};

export type AvailableSlot = {
  readonly startsAt: Date;
  readonly endsAt: Date;
};

export type BuildAvailableSlotsParams = {
  readonly agentIds: readonly string[];
  readonly rules: readonly WeeklyRule[];
  readonly busy: readonly BusyRange[];
  readonly settings: ScheduleSettings;
  readonly now: Date;
};
