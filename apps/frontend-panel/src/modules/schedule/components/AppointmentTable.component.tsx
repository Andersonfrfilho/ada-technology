/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { CalendarX, MessageSquare } from 'lucide-react';

import locale from '@/modules/schedule/schedule.locale.json';
import type { Appointment, PanelAgent } from '@/modules/schedule/types/schedule.types';

const SCHEDULED = 'scheduled';

const CELL = 'px-3 py-2 text-sm text-ink-900 dark:text-gray-200';
const HEAD = 'px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400';
const ACTION =
  'flex min-h-11 items-center gap-2 rounded-panel px-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800';

type AppointmentTableProps = {
  readonly appointments: readonly Appointment[];
  readonly agents: readonly PanelAgent[];
  readonly timezone: string;
  readonly cancelingId?: string;
  readonly onCancel: (appointmentId: string) => void;
  readonly onOpenConversation: (sessionId: string) => void;
};

export function AppointmentTable({
  appointments,
  agents,
  timezone,
  cancelingId,
  onCancel,
  onOpenConversation,
}: AppointmentTableProps) {
  const nameById = new Map(agents.map((agent) => [agent.id, agent.name]));

  return (
    <div className="overflow-x-auto">
      <table className="w-full whitespace-nowrap">
        <thead className="border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th className={HEAD}>{locale.appointments.when}</th>
            <th className={HEAD}>{locale.appointments.who}</th>
            <th className={HEAD}>{locale.appointments.channel}</th>
            <th className={HEAD}>{locale.appointments.status}</th>
            <th className={HEAD}>{locale.appointments.actions}</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr
              className="border-b border-gray-100 last:border-0 odd:bg-gray-50 dark:border-gray-800 dark:odd:bg-gray-800/40"
              key={appointment.id}
            >
              <td className={CELL}>{formatWhen({ appointment, timezone })}</td>
              <td className={CELL}>
                {appointment.agentIds.map((id) => nameById.get(id) ?? id).join(', ')}
              </td>
              <td className={CELL}>{labelOf(locale.channel, appointment.sourceChannel)}</td>
              <td className={CELL}>{labelOf(locale.status, appointment.status)}</td>
              <td className={CELL}>
                <span className="flex items-center gap-1">
                  <button
                    className={ACTION}
                    onClick={() => onOpenConversation(appointment.sessionId)}
                    type="button"
                  >
                    <MessageSquare aria-hidden="true" className="size-4" />
                    {locale.appointments.openConversation}
                  </button>

                  {appointment.status === SCHEDULED ? (
                    <button
                      className={ACTION}
                      disabled={cancelingId === appointment.id}
                      onClick={() => onCancel(appointment.id)}
                      type="button"
                    >
                      <CalendarX aria-hidden="true" className="size-4" />
                      {cancelingId === appointment.id
                        ? locale.appointments.canceling
                        : locale.appointments.cancel}
                    </button>
                  ) : null}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A hora aparece no fuso da agenda, nao no do navegador.
 *
 * Quem opera de outro fuso precisa ver o horario que o cliente vai receber — converter para o
 * relogio local produziria "as 9h" para um e "as 5h" para outro, sobre a mesma reserva.
 */
function formatWhen(params: {
  readonly appointment: Appointment;
  readonly timezone: string;
}): string {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: params.timezone,
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return formatter.format(new Date(params.appointment.startsAt));
}

function labelOf(dictionary: Readonly<Record<string, string>>, key: string): string {
  return dictionary[key] ?? key;
}
