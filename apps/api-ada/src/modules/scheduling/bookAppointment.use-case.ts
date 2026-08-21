/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { SlotUnavailableError } from '@/modules/scheduling/scheduling.error';
import type {
  Appointment,
  BookAppointmentParams,
  SchedulingRepositoryInterface,
} from '@/modules/scheduling/types/scheduling.types';
import { ListAvailableSlotsUseCase } from '@/modules/scheduling/listAvailableSlots.use-case';

const MILLISECONDS_IN_MINUTE = 60_000;

/**
 * Reserva o horario escolhido.
 *
 * Tres camadas, e so a ultima e garantia: a lista de horarios livres barra o pedido absurdo, a
 * checagem de idempotencia devolve a reserva que o cliente ja fez, e a constraint do banco decide
 * quem ganhou quando dois clicam no mesmo segundo. As duas primeiras existem para dar mensagem
 * boa; sem a terceira, o horario sairia vendido duas vezes.
 */
export class BookAppointmentUseCase {
  /**
   * O relogio entra pelo construtor, e nao como parametro da chamada.
   *
   * Parametro seria hora vinda do cliente, e hora vinda do cliente compra qualquer horario passado.
   */
  constructor(
    private readonly repository: SchedulingRepositoryInterface,
    private readonly listSlots: ListAvailableSlotsUseCase,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(params: BookAppointmentParams): Promise<Appointment> {
    const existing = await this.repository.findBySessionAndStart({
      sessionId: params.sessionId,
      startsAt: params.startsAt,
    });
    if (existing) return existing;

    const settings = await this.repository.getSettings();
    const slots = await this.listSlots.execute({ agentIds: params.agentIds, now: this.clock() });

    const isOffered = slots.some((slot) => slot.startsAt.getTime() === params.startsAt.getTime());
    if (!isOffered) throw new SlotUnavailableError({ startsAt: params.startsAt.toISOString() });

    const endsAt = new Date(params.startsAt.getTime() + settings.slotMinutes * MILLISECONDS_IN_MINUTE);
    const booked = await this.repository.book({ ...params, endsAt });

    if (!booked) throw new SlotUnavailableError({ startsAt: params.startsAt.toISOString() });

    return booked;
  }
}
