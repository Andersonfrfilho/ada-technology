/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { DomainError } from '@/shared/errors/AppError';
import { ERROR_CODES } from '@/shared/errors/codes';

const UNPROCESSABLE_ENTITY = 422;
const SERVICE_UNAVAILABLE = 503;

/** Canal existe no produto, mas este ambiente nao tem como entregar a mensagem simulada. */
export class SimulationChannelUnavailableError extends DomainError {
  constructor(channel: string) {
    super({
      code: ERROR_CODES.simulation.CHANNEL_UNAVAILABLE,
      message: `Simulacao indisponivel no canal ${channel}`,
      statusCode: SERVICE_UNAVAILABLE,
      context: { channel },
    });
  }
}

export class SimulationCommandUnsupportedError extends DomainError {
  constructor({ channel, kind }: { channel: string; kind: string }) {
    super({
      code: ERROR_CODES.simulation.COMMAND_UNSUPPORTED,
      message: `Comando ${kind} nao existe na simulacao do canal ${channel}`,
      statusCode: UNPROCESSABLE_ENTITY,
      context: { channel, kind },
    });
  }
}
