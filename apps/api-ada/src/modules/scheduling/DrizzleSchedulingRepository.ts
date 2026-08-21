/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { and, asc, eq, gte, inArray, lt, lte } from 'drizzle-orm';

import { database } from '@/infra/database/client';
import {
  agentSchedules,
  agentTimeOff,
  appointmentAgents,
  appointments,
  scheduleSettings,
} from '@/infra/database/schema';
import {
  APPOINTMENT_STATUS,
  SCHEDULE_SETTINGS_DEFAULT,
} from '@/modules/scheduling/scheduling.constant';
import type {
  Appointment,
  BookAppointmentParams,
  BusyRange,
  ListAppointmentsFilters,
  ScheduleSettings,
  SchedulingRepositoryInterface,
  WeeklyRule,
} from '@/modules/scheduling/types/scheduling.types';
import type { AppointmentStatus } from '@/modules/scheduling/scheduling.constant';
import type { ConversationChannel } from '@/shared/constants/domain.constant';

/** Violacao de unique no Postgres. E o codigo que separa "horario tomado" de "banco quebrado". */
const UNIQUE_VIOLATION = '23505';

export class DrizzleSchedulingRepository implements SchedulingRepositoryInterface {
  /** Sem linha salva, vale o padrao do codigo — que nasce desligado. */
  async getSettings(): Promise<ScheduleSettings> {
    const [row] = await database.select().from(scheduleSettings).limit(1);
    if (!row) return { ...SCHEDULE_SETTINGS_DEFAULT };

    return {
      timezone: row.timezone,
      slotMinutes: row.slotMinutes,
      minimumNoticeMinutes: row.minimumNoticeMinutes,
      horizonDays: row.horizonDays,
      isEnabled: row.isEnabled,
    };
  }

  /** Linha unica: a primeira gravacao cria, as seguintes atualizam a mesma. */
  async saveSettings(settings: ScheduleSettings): Promise<ScheduleSettings> {
    const [existing] = await database.select({ id: scheduleSettings.id }).from(scheduleSettings).limit(1);

    if (!existing) {
      await database.insert(scheduleSettings).values(settings);
      return settings;
    }

    await database
      .update(scheduleSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(scheduleSettings.id, existing.id));

    return settings;
  }

  async listRules(agentIds?: readonly string[]): Promise<readonly WeeklyRule[]> {
    if (agentIds && agentIds.length === 0) return [];

    const rows = await database
      .select({
        agentId: agentSchedules.agentId,
        weekday: agentSchedules.weekday,
        startMinute: agentSchedules.startMinute,
        endMinute: agentSchedules.endMinute,
      })
      .from(agentSchedules)
      .where(agentIds ? inArray(agentSchedules.agentId, [...agentIds]) : undefined)
      .orderBy(asc(agentSchedules.weekday), asc(agentSchedules.startMinute));

    return rows;
  }

  /**
   * A tela manda a grade inteira, e o banco fica exatamente com ela.
   *
   * Diferenca linha a linha exigiria id estavel de faixa na tela para ganhar nada: a grade semanal
   * e pequena, e apagar e regravar dentro da transacao nao deixa estado intermediario visivel.
   */
  async replaceRules(rules: readonly WeeklyRule[]): Promise<void> {
    const agentIds = [...new Set(rules.map((rule) => rule.agentId))];

    await database.transaction(async (transaction) => {
      if (agentIds.length > 0) {
        await transaction.delete(agentSchedules).where(inArray(agentSchedules.agentId, agentIds));
      }
      if (rules.length > 0) {
        await transaction.insert(agentSchedules).values([...rules]);
      }
    });
  }

  /**
   * Tudo que tira o atendente do ar na janela: bloqueio manual e reserva ja feita.
   *
   * A ocupacao de agenda externa entra por outro caminho (Fase 5) e se soma a esta lista — o
   * calculo de disponibilidade nao distingue a origem.
   */
  async listBusy(params: {
    readonly agentIds: readonly string[];
    readonly from: Date;
    readonly to: Date;
  }): Promise<readonly BusyRange[]> {
    if (params.agentIds.length === 0) return [];

    const agentIds = [...params.agentIds];

    const [timeOff, booked] = await Promise.all([
      database
        .select({
          agentId: agentTimeOff.agentId,
          startsAt: agentTimeOff.startsAt,
          endsAt: agentTimeOff.endsAt,
        })
        .from(agentTimeOff)
        .where(
          and(
            inArray(agentTimeOff.agentId, agentIds),
            lt(agentTimeOff.startsAt, params.to),
            gte(agentTimeOff.endsAt, params.from),
          ),
        ),
      database
        .select({
          agentId: appointmentAgents.agentId,
          startsAt: appointments.startsAt,
          endsAt: appointments.endsAt,
        })
        .from(appointmentAgents)
        .innerJoin(appointments, eq(appointments.id, appointmentAgents.appointmentId))
        .where(
          and(
            inArray(appointmentAgents.agentId, agentIds),
            eq(appointmentAgents.status, APPOINTMENT_STATUS.SCHEDULED),
            lt(appointments.startsAt, params.to),
            gte(appointments.endsAt, params.from),
          ),
        ),
    ]);

    return [...timeOff, ...booked];
  }

  /**
   * A reserva inteira, ou nada.
   *
   * Quem decide a colisao e o indice unico parcial de `appointment_agents`: duas requisicoes no
   * mesmo instante entram as duas, e a segunda leva `23505` e sai como indisponivel. Ler antes de
   * escrever nao seguraria nada — entre a leitura e a escrita cabe a outra transacao inteira.
   */
  async book(
    params: BookAppointmentParams & { readonly endsAt: Date },
  ): Promise<Appointment | undefined> {
    try {
      return await database.transaction(async (transaction) => {
        const [created] = await transaction
          .insert(appointments)
          .values({
            sessionId: params.sessionId,
            startsAt: params.startsAt,
            endsAt: params.endsAt,
            sourceChannel: params.sourceChannel,
          })
          .returning();

        if (!created) return undefined;

        await transaction.insert(appointmentAgents).values(
          params.agentIds.map((agentId) => ({
            appointmentId: created.id,
            agentId,
            startsAt: params.startsAt,
          })),
        );

        return toAppointment({ row: created, agentIds: params.agentIds });
      });
    } catch (error) {
      if (isUniqueViolation(error)) return undefined;
      throw error;
    }
  }

  async findBySessionAndStart(params: {
    readonly sessionId: string;
    readonly startsAt: Date;
  }): Promise<Appointment | undefined> {
    const [row] = await database
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.sessionId, params.sessionId),
          eq(appointments.startsAt, params.startsAt),
          eq(appointments.status, APPOINTMENT_STATUS.SCHEDULED),
        ),
      )
      .limit(1);

    if (!row) return undefined;

    return toAppointment({ row, agentIds: await this.agentIdsOf(row.id) });
  }

  async findById(appointmentId: string): Promise<Appointment | undefined> {
    const [row] = await database
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (!row) return undefined;

    return toAppointment({ row, agentIds: await this.agentIdsOf(row.id) });
  }

  /**
   * Cancelar e mudar o status nos dois lados.
   *
   * `appointment_agents` tambem, porque o unique parcial e sobre ele: sem esta linha o horario
   * continuaria bloqueado para todo mundo depois do cancelamento.
   */
  async cancel(appointmentId: string): Promise<void> {
    const canceledAt = new Date();

    await database.transaction(async (transaction) => {
      await transaction
        .update(appointments)
        .set({ status: APPOINTMENT_STATUS.CANCELED, canceledAt, updatedAt: canceledAt })
        .where(eq(appointments.id, appointmentId));

      await transaction
        .update(appointmentAgents)
        .set({ status: APPOINTMENT_STATUS.CANCELED })
        .where(eq(appointmentAgents.appointmentId, appointmentId));
    });
  }

  async list(filters: ListAppointmentsFilters): Promise<readonly Appointment[]> {
    const rows = await database
      .select()
      .from(appointments)
      .where(and(gte(appointments.startsAt, filters.from), lte(appointments.startsAt, filters.to)))
      .orderBy(asc(appointments.startsAt));

    if (rows.length === 0) return [];

    const links = await database
      .select({
        appointmentId: appointmentAgents.appointmentId,
        agentId: appointmentAgents.agentId,
      })
      .from(appointmentAgents)
      .where(
        inArray(
          appointmentAgents.appointmentId,
          rows.map((row) => row.id),
        ),
      );

    const byAppointment = new Map<string, string[]>();
    for (const link of links) {
      byAppointment.set(link.appointmentId, [
        ...(byAppointment.get(link.appointmentId) ?? []),
        link.agentId,
      ]);
    }

    const all = rows.map((row) =>
      toAppointment({ row, agentIds: byAppointment.get(row.id) ?? [] }),
    );

    // Filtrar por atendente na memoria: o join reduziria a lista antes de saber quem mais atende,
    // e a tela precisa mostrar o agendamento inteiro, nao so a parte do filtrado.
    if (!filters.agentId) return all;

    return all.filter((appointment) => appointment.agentIds.includes(filters.agentId as string));
  }

  private async agentIdsOf(appointmentId: string): Promise<readonly string[]> {
    const rows = await database
      .select({ agentId: appointmentAgents.agentId })
      .from(appointmentAgents)
      .where(eq(appointmentAgents.appointmentId, appointmentId));

    return rows.map((row) => row.agentId);
  }
}

type AppointmentRow = typeof appointments.$inferSelect;

function toAppointment(params: {
  readonly row: AppointmentRow;
  readonly agentIds: readonly string[];
}): Appointment {
  return {
    id: params.row.id,
    sessionId: params.row.sessionId,
    startsAt: params.row.startsAt,
    endsAt: params.row.endsAt,
    status: params.row.status as AppointmentStatus,
    sourceChannel: params.row.sourceChannel as ConversationChannel,
    agentIds: [...params.agentIds],
  };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error
    && (error as { readonly code?: unknown }).code === UNIQUE_VIOLATION;
}
