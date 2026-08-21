/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { DomainError } from '@/shared/errors/AppError';
import { ERROR_CODES } from '@/shared/errors/codes';

const NOT_FOUND = 404;
const CONFLICT = 409;
const UNPROCESSABLE = 422;

/** Agenda desligada nao e erro do cliente: e o time que ainda nao declarou horario nenhum. */
export class SchedulingDisabledError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.scheduling.DISABLED,
      message: 'Agendamento indisponivel no momento',
      statusCode: UNPROCESSABLE,
    });
  }
}

/**
 * O horario foi embora entre a lista e o clique.
 *
 * Nasce da constraint, nao de uma leitura previa: quem chegou um instante depois recebe isto, e o
 * cliente refaz a escolha com a lista ja sem o horario.
 */
export class SlotUnavailableError extends DomainError {
  constructor(context: { readonly startsAt: string }) {
    super({
      code: ERROR_CODES.scheduling.SLOT_UNAVAILABLE,
      message: 'Este horario acabou de ser reservado',
      statusCode: CONFLICT,
      context,
    });
  }
}

export class AppointmentNotFoundError extends DomainError {
  constructor(context: { readonly appointmentId: string }) {
    super({
      code: ERROR_CODES.scheduling.APPOINTMENT_NOT_FOUND,
      message: 'Agendamento nao encontrado',
      statusCode: NOT_FOUND,
      context,
    });
  }
}

/** Atendente sem regra semanal nenhuma nao pode ser oferecido: nao ha o que reservar. */
export class AgentNotSchedulableError extends DomainError {
  constructor(context: { readonly agentId: string }) {
    super({
      code: ERROR_CODES.scheduling.AGENT_NOT_SCHEDULABLE,
      message: 'Atendente sem agenda configurada',
      statusCode: UNPROCESSABLE,
      context,
    });
  }
}
