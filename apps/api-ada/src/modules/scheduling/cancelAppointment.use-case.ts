/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { APPOINTMENT_STATUS } from '@/modules/scheduling/scheduling.constant';
import { AppointmentNotFoundError } from '@/modules/scheduling/scheduling.error';
import type {
  Appointment,
  SchedulingRepositoryInterface,
} from '@/modules/scheduling/types/scheduling.types';

/** Cancelar duas vezes nao e erro: o segundo pedido encontra o mesmo estado que o primeiro deixou. */
export class CancelAppointmentUseCase {
  constructor(private readonly repository: SchedulingRepositoryInterface) {}

  async execute(appointmentId: string): Promise<Appointment> {
    const appointment = await this.repository.findById(appointmentId);
    if (!appointment) throw new AppointmentNotFoundError({ appointmentId });

    if (appointment.status === APPOINTMENT_STATUS.CANCELED) return appointment;

    await this.repository.cancel(appointmentId);

    return { ...appointment, status: APPOINTMENT_STATUS.CANCELED };
  }
}
