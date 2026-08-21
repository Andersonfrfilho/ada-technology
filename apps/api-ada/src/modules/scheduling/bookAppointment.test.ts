/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, test } from 'bun:test';

import { BookAppointmentUseCase } from '@/modules/scheduling/bookAppointment.use-case';
import { CancelAppointmentUseCase } from '@/modules/scheduling/cancelAppointment.use-case';
import { ListAvailableSlotsUseCase } from '@/modules/scheduling/listAvailableSlots.use-case';
import { APPOINTMENT_STATUS } from '@/modules/scheduling/scheduling.constant';
import {
  SchedulingDisabledError,
  SlotUnavailableError,
} from '@/modules/scheduling/scheduling.error';
import type {
  Appointment,
  BookAppointmentParams,
  BusyRange,
  ListAppointmentsFilters,
  ScheduleSettings,
  SchedulingRepositoryInterface,
  WeeklyRule,
} from '@/modules/scheduling/types/scheduling.types';
import { CONVERSATION_CHANNEL } from '@/shared/constants/domain.constant';

const ANA = 'a0000000-0000-4000-8000-000000000001';
const SESSION = 'b0000000-0000-4000-8000-000000000009';

/** Sexta-feira, 8h em Sao Paulo. A agenda da Ana e das 9h as 12h. */
const NOW = new Date('2026-08-21T11:00:00Z');
const FIRST_SLOT = new Date('2026-08-21T12:00:00Z');

const SETTINGS: ScheduleSettings = {
  timezone: 'America/Sao_Paulo',
  slotMinutes: 60,
  minimumNoticeMinutes: 0,
  horizonDays: 1,
  isEnabled: true,
};

const RULES: readonly WeeklyRule[] = [
  { agentId: ANA, weekday: 5, startMinute: 9 * 60, endMinute: 12 * 60 },
];

/**
 * Repositorio de mentira que guarda o que gravou.
 *
 * `book` recusa o horario ja tomado do mesmo jeito que a constraint recusa — devolvendo `undefined`.
 * E o comportamento que o caso de uso precisa saber tratar; a garantia de verdade e do indice.
 */
function fakeRepository(overrides: Partial<{ settings: ScheduleSettings; busy: readonly BusyRange[] }> = {}) {
  const stored: Appointment[] = [];
  const taken = new Set<string>();

  const repository: SchedulingRepositoryInterface = {
    getSettings: async () => overrides.settings ?? SETTINGS,
    saveSettings: async (settings) => settings,
    listRules: async () => RULES,
    replaceRules: async () => undefined,
    listBusy: async () => overrides.busy ?? [],
    book: async (params: BookAppointmentParams & { readonly endsAt: Date }) => {
      const key = `${params.agentIds.join(',')}@${params.startsAt.toISOString()}`;
      if (taken.has(key)) return undefined;
      taken.add(key);

      const appointment: Appointment = {
        id: `appointment-${stored.length + 1}`,
        sessionId: params.sessionId,
        startsAt: params.startsAt,
        endsAt: params.endsAt,
        status: APPOINTMENT_STATUS.SCHEDULED,
        sourceChannel: params.sourceChannel,
        agentIds: params.agentIds,
      };
      stored.push(appointment);

      return appointment;
    },
    findBySessionAndStart: async ({ sessionId, startsAt }) =>
      stored.find(
        (item) =>
          item.sessionId === sessionId
          && item.startsAt.getTime() === startsAt.getTime()
          && item.status === APPOINTMENT_STATUS.SCHEDULED,
      ),
    findById: async (appointmentId) => stored.find((item) => item.id === appointmentId),
    cancel: async (appointmentId) => {
      const index = stored.findIndex((item) => item.id === appointmentId);
      const current = stored[index];
      if (!current) return;

      stored[index] = { ...current, status: APPOINTMENT_STATUS.CANCELED };
      taken.delete(`${current.agentIds.join(',')}@${current.startsAt.toISOString()}`);
    },
    list: async (_filters: ListAppointmentsFilters) => stored,
  };

  return { repository, stored };
}

function bookingOf(repository: SchedulingRepositoryInterface): BookAppointmentUseCase {
  return new BookAppointmentUseCase(repository, new ListAvailableSlotsUseCase(repository), () => NOW);
}

const REQUEST: BookAppointmentParams = {
  sessionId: SESSION,
  agentIds: [ANA],
  startsAt: FIRST_SLOT,
  sourceChannel: CONVERSATION_CHANNEL.WIDGET,
};

describe('BookAppointmentUseCase', () => {
  test('reserva o horario oferecido', async () => {
    const { repository, stored } = fakeRepository();

    const appointment = await bookingOf(repository).execute(REQUEST);

    expect(appointment.status).toBe(APPOINTMENT_STATUS.SCHEDULED);
    expect(appointment.endsAt.toISOString()).toBe('2026-08-21T13:00:00.000Z');
    expect(stored).toHaveLength(1);
  });

  /** Rede caiu e o cliente tocou de novo: a segunda chamada devolve a reserva, nao uma segunda. */
  test('e idempotente pela sessao e pelo horario', async () => {
    const { repository, stored } = fakeRepository();
    const booking = bookingOf(repository);

    const first = await booking.execute(REQUEST);
    const second = await booking.execute(REQUEST);

    expect(second.id).toBe(first.id);
    expect(stored).toHaveLength(1);
  });

  test('recusa horario que nao esta na lista de livres', async () => {
    const { repository } = fakeRepository();
    const outsideBusinessHours = { ...REQUEST, startsAt: new Date('2026-08-21T22:00:00Z') };

    await expect(bookingOf(repository).execute(outsideBusinessHours)).rejects.toBeInstanceOf(
      SlotUnavailableError,
    );
  });

  /** Outro cliente chegou primeiro: o `undefined` do repositorio e a constraint falando. */
  test('recusa quando o horario e tomado entre a lista e a gravacao', async () => {
    const { repository } = fakeRepository();
    await bookingOf(repository).execute(REQUEST);

    const otherSession = { ...REQUEST, sessionId: 'c0000000-0000-4000-8000-000000000002' };

    await expect(bookingOf(repository).execute(otherSession)).rejects.toBeInstanceOf(
      SlotUnavailableError,
    );
  });

  test('agenda desligada nao oferece nem aceita horario', async () => {
    const { repository } = fakeRepository({ settings: { ...SETTINGS, isEnabled: false } });

    await expect(bookingOf(repository).execute(REQUEST)).rejects.toBeInstanceOf(
      SchedulingDisabledError,
    );
  });
});

describe('CancelAppointmentUseCase', () => {
  test('cancelar libera o horario para outra pessoa', async () => {
    const { repository } = fakeRepository();
    const appointment = await bookingOf(repository).execute(REQUEST);

    const canceled = await new CancelAppointmentUseCase(repository).execute(appointment.id);
    expect(canceled.status).toBe(APPOINTMENT_STATUS.CANCELED);

    const otherSession = { ...REQUEST, sessionId: 'c0000000-0000-4000-8000-000000000002' };
    const rebooked = await bookingOf(repository).execute(otherSession);

    expect(rebooked.startsAt.toISOString()).toBe(FIRST_SLOT.toISOString());
  });
});
