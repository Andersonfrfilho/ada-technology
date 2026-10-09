/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { DomainError } from '@/shared/errors/AppError';
import { ERROR_CODES } from '@/shared/errors/codes';

const BAD_REQUEST = 400;
const FORBIDDEN = 403;
const NOT_FOUND = 404;
const CONFLICT = 409;
const BAD_GATEWAY = 502;
const SERVICE_UNAVAILABLE = 503;

/** Sem token do Railway a infra nao existe: o painel mostra "nao configurado", nunca lista vazia. */
export class InfraNotConfiguredError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.infra.INFRA_NOT_CONFIGURED,
      message: 'Infraestrutura Railway nao configurada',
      statusCode: SERVICE_UNAVAILABLE,
    });
  }
}

export class InfraEnvironmentProtectedError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.infra.INFRA_ENVIRONMENT_PROTECTED,
      message: 'Este ambiente e protegido e nao pode ser desligado pelo painel',
      statusCode: FORBIDDEN,
    });
  }
}

export class InfraEnvironmentNotFoundError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.infra.INFRA_ENVIRONMENT_NOT_FOUND,
      message: 'Ambiente nao encontrado',
      statusCode: NOT_FOUND,
    });
  }
}

export class InfraOperationInProgressError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.infra.INFRA_OPERATION_IN_PROGRESS,
      message: 'Ja existe uma operacao em andamento neste ambiente',
      statusCode: CONFLICT,
    });
  }
}

export class InfraOperationNotFoundError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.infra.INFRA_OPERATION_NOT_FOUND,
      message: 'Operacao nao encontrada',
      statusCode: NOT_FOUND,
    });
  }
}

/** A Railway API falhou ou respondeu algo inesperado. O detalhe fica no log, nunca na resposta. */
export class RailwayRequestFailedError extends DomainError {
  constructor(operation: string) {
    super({
      code: ERROR_CODES.infra.RAILWAY_REQUEST_FAILED,
      message: 'Nao foi possivel falar com o Railway',
      statusCode: BAD_GATEWAY,
      context: { operation },
    });
  }
}

/** O Railway respondeu, mas recusou: `isAuthFailure` separa token invalido de qualquer outra recusa. */
export class RailwayRejectedError extends RailwayRequestFailedError {
  constructor(params: { readonly operation: string; readonly isAuthFailure: boolean }) {
    super(params.operation);
    this.isAuthFailure = params.isAuthFailure;
  }

  readonly isAuthFailure: boolean;
}

export class RailwayRateLimitedError extends DomainError {
  constructor(retryAfterSeconds?: number) {
    super({
      code: ERROR_CODES.infra.RAILWAY_RATE_LIMITED,
      message: 'Limite de requisicoes do Railway atingido; tente novamente em instantes',
      statusCode: SERVICE_UNAVAILABLE,
      ...(retryAfterSeconds !== undefined ? { context: { retryAfterSeconds } } : {}),
    });
  }
}

/** Ligar fora da janela de uma agenda ativa exige dizer ate quando o ambiente deve ficar ligado. */
export class InfraKeepOnUntilRequiredError extends DomainError {
  constructor(message = 'Informe ate quando o ambiente deve ficar ligado') {
    super({
      code: ERROR_CODES.infra.INFRA_KEEP_ON_UNTIL_REQUIRED,
      message,
      statusCode: BAD_REQUEST,
    });
  }
}

export class InfraInvalidScheduleError extends DomainError {
  constructor(message = 'Agenda invalida: confira os dias, os horarios e se o ligar e anterior ao desligar') {
    super({
      code: ERROR_CODES.infra.INFRA_INVALID_SCHEDULE,
      message,
      statusCode: BAD_REQUEST,
    });
  }
}
