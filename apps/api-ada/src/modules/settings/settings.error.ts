/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { DomainError } from '@/shared/errors/AppError';
import { ERROR_CODES } from '@/shared/errors/codes';

const SERVICE_UNAVAILABLE = 503;
const BAD_GATEWAY = 502;

/**
 * Template so existe na Meta, e falar com a Meta exige credencial.
 *
 * Sem WhatsApp habilitado a tela nao tem o que listar nem onde criar. Responder 503 e mais honesto
 * que devolver lista vazia: vazio diria "nenhum template aprovado", quando o certo e "nao perguntei".
 */
export class WhatsAppNotConfiguredError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.channel.WHATSAPP_DISABLED,
      message: 'Canal WhatsApp nao configurado',
      statusCode: SERVICE_UNAVAILABLE,
    });
  }
}

/** A Graph API respondeu erro ou nao respondeu. O detalhe fica no log; o painel so precisa saber que falhou. */
export class WhatsAppTemplateRequestFailedError extends DomainError {
  constructor(operation: string) {
    super({
      code: ERROR_CODES.channel.WHATSAPP_TEMPLATE_REQUEST_FAILED,
      message: 'Nao foi possivel falar com a Meta',
      statusCode: BAD_GATEWAY,
      context: { operation },
    });
  }
}
