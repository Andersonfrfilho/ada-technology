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
const FORBIDDEN = 403;

export class ChannelOperationUnsupportedError extends DomainError {
  constructor(operation: string, channel: string) {
    super({
      code: ERROR_CODES.channel.UNSUPPORTED,
      message: `Operacao ${operation} nao existe no canal ${channel}`,
      statusCode: UNPROCESSABLE_ENTITY,
      context: { operation, channel },
    });
  }
}

export class WhatsAppDisabledError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.channel.WHATSAPP_DISABLED,
      message: 'Canal WhatsApp desabilitado neste ambiente',
      statusCode: SERVICE_UNAVAILABLE,
    });
  }
}

export class WidgetOriginNotAllowedError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.channel.WIDGET_ORIGIN_NOT_ALLOWED,
      message: 'Origem nao autorizada para o widget',
      statusCode: FORBIDDEN,
    });
  }
}
