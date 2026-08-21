/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { AppointmentStatus } from '@/modules/scheduling/scheduling.constant';
import type { ConversationChannel } from '@/shared/constants/domain.constant';

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

export type Appointment = {
  readonly id: string;
  readonly sessionId: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly status: AppointmentStatus;
  readonly sourceChannel: ConversationChannel;
  readonly agentIds: readonly string[];
};

export type BookAppointmentParams = {
  readonly sessionId: string;
  readonly agentIds: readonly string[];
  readonly startsAt: Date;
  readonly sourceChannel: ConversationChannel;
};

export type ListSlotsParams = {
  readonly agentIds: readonly string[];
  readonly now?: Date;
};

export type SaveScheduleParams = {
  readonly settings: ScheduleSettings;
  readonly rules: readonly WeeklyRule[];
  readonly agentId: string;
  readonly ipAddress?: string;
};

export type ListAppointmentsFilters = {
  readonly from: Date;
  readonly to: Date;
  readonly agentId?: string;
};

/**
 * O que a disponibilidade precisa do banco, e nada alem.
 *
 * `book` devolve `undefined` quando a constraint recusa: quem chama traduz para o erro de dominio,
 * e o repositorio nao decide status HTTP.
 */
export type SchedulingRepositoryInterface = {
  getSettings(): Promise<ScheduleSettings>;
  saveSettings(settings: ScheduleSettings): Promise<ScheduleSettings>;
  listRules(agentIds?: readonly string[]): Promise<readonly WeeklyRule[]>;
  replaceRules(rules: readonly WeeklyRule[]): Promise<void>;
  listBusy(params: {
    readonly agentIds: readonly string[];
    readonly from: Date;
    readonly to: Date;
  }): Promise<readonly BusyRange[]>;
  book(params: BookAppointmentParams & { readonly endsAt: Date }): Promise<Appointment | undefined>;
  findBySessionAndStart(params: {
    readonly sessionId: string;
    readonly startsAt: Date;
  }): Promise<Appointment | undefined>;
  findById(appointmentId: string): Promise<Appointment | undefined>;
  cancel(appointmentId: string): Promise<void>;
  list(filters: ListAppointmentsFilters): Promise<readonly Appointment[]>;
};
