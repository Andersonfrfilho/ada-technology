/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { DomainError } from '@/shared/errors/AppError';
import { ERROR_CODES } from '@/shared/errors/codes';
import type { InfraSecretUnreadableReason } from '@/modules/infra/types/infraSecret.types';

// 503: falha de configuracao/dado do servidor, nunca erro do cliente nem bug a ser repetido.
const SERVICE_UNAVAILABLE = 503;

/** A mensagem nunca inclui o valor da chave: so o fato de que ela e invalida. */
export class InfraSecretKeyInvalidError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.infra.INFRA_SECRET_KEY_INVALID,
      message: 'Chave de cifra da infraestrutura invalida',
      statusCode: SERVICE_UNAVAILABLE,
    });
  }
}

/** Carrega so o motivo de enum fixo: texto claro, cifrado e chave nunca entram aqui. */
export class InfraSecretUnreadableError extends DomainError {
  readonly reason: InfraSecretUnreadableReason;

  constructor(reason: InfraSecretUnreadableReason) {
    super({
      code: ERROR_CODES.infra.INFRA_SECRET_UNREADABLE,
      message: 'Segredo da infraestrutura ilegivel',
      statusCode: SERVICE_UNAVAILABLE,
      context: { reason },
    });
    this.reason = reason;
  }
}
