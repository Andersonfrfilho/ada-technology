/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { Booking } from '@adatechnology/scheduling-contracts';
import type { SchedulingModule } from '@adatechnology/scheduling-module';

import {
  SCHEDULING_DEFAULT_SERVICE,
  SCHEDULING_FLOW_HORIZON_DAYS,
  SCHEDULING_PROVISION_PAGE_SIZE,
} from '@/modules/scheduling/scheduling.constant';
import type { AgendaAttendant, BookAgendaParams } from '@/modules/scheduling/types/scheduling.types';

const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

/**
 * O vocabulario da agenda do bot sobre o do modulo.
 *
 * O modulo fala recurso, servico e reserva; a conversa fala pessoa e horario. A traducao mora aqui
 * e nao espalhada nas acoes de fluxo — o dia em que houver mais de um servico, e este arquivo que
 * muda, e o texto do bot fica onde esta.
 */
export class SchedulingAgenda {
  constructor(
    private readonly scheduling: SchedulingModule,
    private readonly companyId: string,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async listAttendants(): Promise<readonly AgendaAttendant[]> {
    const { data } = await this.scheduling.useCases.listResources.execute({
      companyId: this.companyId,
      active: true,
      pageSize: SCHEDULING_PROVISION_PAGE_SIZE,
    });

    return data.map((resource) => ({
      id: resource.id,
      name: resource.name,
      timezone: resource.timezone,
    }));
  }

  /** Vazio quando o atendente ainda nao tem regra semanal — agenda sem horario nao e erro. */
  async listSlots(resourceId: string): Promise<readonly Date[]> {
    const serviceId = await this.resolveServiceId();
    if (!serviceId) return [];

    const from = this.clock();
    const until = new Date(from.getTime() + SCHEDULING_FLOW_HORIZON_DAYS * MILLISECONDS_IN_DAY);

    const slots = await this.scheduling.useCases.listAvailableSlots.execute({
      companyId: this.companyId,
      resourceId,
      serviceId,
      from,
      until,
    });

    return slots.map((slot) => slot.startsAt);
  }

  /**
   * A chave de idempotencia e sessao mais instante.
   *
   * Rede caindo entre o toque e a confirmacao faz o cliente tocar de novo; sem a chave, a segunda
   * chamada viraria a segunda reserva do mesmo horario para a mesma pessoa.
   */
  async book(params: BookAgendaParams): Promise<Booking> {
    const serviceId = await this.resolveServiceId();
    const durationMinutes = SCHEDULING_DEFAULT_SERVICE.durationMinutes;
    const endsAt = new Date(params.startsAt.getTime() + durationMinutes * 60_000);

    const { booking } = await this.scheduling.useCases.requestBooking.execute({
      companyId: this.companyId,
      idempotencyKey: `${params.sessionId}:${params.startsAt.toISOString()}`,
      input: {
        title: SCHEDULING_DEFAULT_SERVICE.name,
        ...(serviceId ? { serviceId } : {}),
        during: { start: params.startsAt, end: endsAt },
        resourceIds: [params.resourceId],
        // Referencia opaca: a sessao diz de quem e a conversa sem copiar nome nem telefone.
        customerRef: params.sessionId,
      },
    });

    return booking;
  }

  private async resolveServiceId(): Promise<string | undefined> {
    const { data } = await this.scheduling.useCases.listServices.execute({
      companyId: this.companyId,
      active: true,
      pageSize: SCHEDULING_PROVISION_PAGE_SIZE,
    });

    return data.find((service) => service.name === SCHEDULING_DEFAULT_SERVICE.name)?.id;
  }
}
