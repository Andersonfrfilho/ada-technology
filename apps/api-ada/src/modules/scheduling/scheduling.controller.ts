/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import {
  cancelAppointment,
  listAvailableSlots,
  recordAuditLog,
  saveSchedule,
  schedulingRepository,
} from '@/infra/container';
import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { readJsonBody } from '@/infra/http/requestBody';
import { jsonData } from '@/infra/http/responses';
import { AUTH_REQUIREMENT, HTTP_METHOD, requireAgent, type Route } from '@/infra/http/router';
import { ACTOR_TYPE, AUDIT_ACTION, AUDIT_TARGET } from '@/modules/audit/audit.constant';
import {
  appointmentIdSchema,
  appointmentsQuerySchema,
  availableSlotsQuerySchema,
  saveScheduleSchema,
} from '@/modules/scheduling/scheduling.schema';
import type { Appointment } from '@/modules/scheduling/types/scheduling.types';

const SCHEDULE_PATH = '/v1/panel/schedule';
const SLOTS_PATH = '/v1/panel/schedule/slots';
const APPOINTMENTS_PATH = '/v1/panel/appointments';
const APPOINTMENT_PATH = '/v1/panel/appointments/:appointmentId';

/**
 * A agenda so tem rota de painel.
 *
 * Reservar pelo bot passa pelo caso de uso em processo (Fase 4), nao por HTTP: um endpoint publico
 * de reserva seria uma porta anonima para ocupar a agenda inteira do time.
 */
const readScheduleRoute: Route = {
  method: HTTP_METHOD.GET,
  path: SCHEDULE_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_READ,
  handler: async () => {
    const [settings, rules] = await Promise.all([
      schedulingRepository.getSettings(),
      schedulingRepository.listRules(),
    ]);

    return jsonData({ settings, rules });
  },
};

const saveScheduleRoute: Route = {
  method: HTTP_METHOD.PUT,
  path: SCHEDULE_PATH,
  auth: AUTH_REQUIREMENT.ADMIN,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async (context) => {
    const payload = saveScheduleSchema.parse(await readJsonBody(context.request));
    const { agentId } = requireAgent(context);

    const saved = await saveSchedule.execute({
      ...payload,
      agentId,
      ipAddress: context.clientAddress,
    });

    return jsonData(saved);
  },
};

const availableSlotsRoute: Route = {
  method: HTTP_METHOD.GET,
  path: SLOTS_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_READ,
  handler: async ({ url }) => {
    const query = availableSlotsQuerySchema.parse(Object.fromEntries(url.searchParams));
    const slots = await listAvailableSlots.execute({ agentIds: query.agentId });

    return jsonData(
      slots.map((slot) => ({
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
      })),
    );
  },
};

const listAppointmentsRoute: Route = {
  method: HTTP_METHOD.GET,
  path: APPOINTMENTS_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_READ,
  handler: async ({ url }) => {
    const query = appointmentsQuerySchema.parse(Object.fromEntries(url.searchParams));

    const rows = await schedulingRepository.list({
      from: query.from,
      to: query.to,
      ...(query.agentId ? { agentId: query.agentId } : {}),
    });

    return jsonData(rows.map(toPanelAppointment));
  },
};

const cancelAppointmentRoute: Route = {
  method: HTTP_METHOD.DELETE,
  path: APPOINTMENT_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async (context) => {
    const appointmentId = appointmentIdSchema.parse(context.params.appointmentId);
    const { agentId } = requireAgent(context);

    const canceled = await cancelAppointment.execute(appointmentId);

    await recordAuditLog.execute({
      actorType: ACTOR_TYPE.AGENT,
      actorId: agentId,
      action: AUDIT_ACTION.APPOINTMENT_CANCELED,
      targetType: AUDIT_TARGET.APPOINTMENT,
      targetId: appointmentId,
      ipAddress: context.clientAddress,
    });

    return jsonData(toPanelAppointment(canceled));
  },
};

/** A sessao sai para a tela poder abrir a conversa; nome e telefone continuam vindo de la. */
function toPanelAppointment(appointment: Appointment): Record<string, unknown> {
  return {
    id: appointment.id,
    sessionId: appointment.sessionId,
    startsAt: appointment.startsAt.toISOString(),
    endsAt: appointment.endsAt.toISOString(),
    status: appointment.status,
    sourceChannel: appointment.sourceChannel,
    agentIds: appointment.agentIds,
  };
}

export const panelSchedulingRoutes: readonly Route[] = [
  readScheduleRoute,
  saveScheduleRoute,
  availableSlotsRoute,
  listAppointmentsRoute,
  cancelAppointmentRoute,
];
