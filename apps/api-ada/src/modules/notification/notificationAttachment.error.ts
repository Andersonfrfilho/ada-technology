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
const PAYLOAD_TOO_LARGE = 413;
const UNSUPPORTED_MEDIA_TYPE = 415;
const BAD_GATEWAY = 502;
const SERVICE_UNAVAILABLE = 503;

/** Bucket de anexo ausente: capacidade por ausencia, e a rota responde em vez de nem existir. */
export class NotificationAttachmentUnavailableError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.notification.ATTACHMENT_UNAVAILABLE,
      message: 'Anexo indisponivel: o bucket de anexos nao esta configurado',
      statusCode: SERVICE_UNAVAILABLE,
    });
  }
}

export class NotificationAttachmentInvalidError extends DomainError {
  constructor(reason: string) {
    super({
      code: ERROR_CODES.notification.ATTACHMENT_INVALID,
      message: `Anexo invalido: ${reason}`,
      statusCode: BAD_REQUEST,
    });
  }
}

/** 413 e nao 400: o cliente precisa distinguir "arquivo grande" de "campo errado" para orientar quem enviou. */
export class NotificationAttachmentTooLargeError extends DomainError {
  constructor(maxBytes: number) {
    super({
      code: ERROR_CODES.notification.ATTACHMENT_TOO_LARGE,
      message: `Anexo acima do limite de ${Math.floor(maxBytes / (1024 * 1024))}MB`,
      statusCode: PAYLOAD_TOO_LARGE,
    });
  }
}

export class NotificationAttachmentTypeNotAllowedError extends DomainError {
  constructor(contentType: string) {
    super({
      code: ERROR_CODES.notification.ATTACHMENT_TYPE_NOT_ALLOWED,
      message: `Tipo de arquivo nao aceito: ${contentType}`,
      statusCode: UNSUPPORTED_MEDIA_TYPE,
    });
  }
}

/** Falha do bucket vira erro de dominio na fronteira do adapter (code-standart §7). */
export class NotificationAttachmentStoreFailedError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.notification.ATTACHMENT_STORE_FAILED,
      message: 'Nao foi possivel guardar o anexo agora',
      statusCode: BAD_GATEWAY,
    });
  }
}
