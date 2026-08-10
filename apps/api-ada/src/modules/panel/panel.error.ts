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
const UNAUTHORIZED = 401;

/**
 * Conversa que nao existe — ou que existe em outra empresa.
 *
 * As duas respondem igual de proposito: distinguir daria ao painel de um cliente uma forma de
 * descobrir os ids de outro, e o `companyId` da consulta vem do ambiente, nunca do pedido.
 */
export class PanelConversationNotFoundError extends DomainError {
  constructor(conversationId: string) {
    super({
      code: ERROR_CODES.conversation.NOT_FOUND,
      message: 'Conversa nao encontrada',
      statusCode: NOT_FOUND,
      context: { conversationId },
    });
  }
}

/** Bilhete ausente, expirado, ja usado, ou emitido para outra conversa. */
export class RealtimeTicketInvalidError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.panel.REALTIME_TICKET_INVALID,
      message: 'Bilhete de tempo real invalido',
      statusCode: UNAUTHORIZED,
    });
  }
}
