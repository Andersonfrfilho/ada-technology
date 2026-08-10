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

/**
 * Id fora do formato do widget.
 *
 * Responde 404 de proposito: as sessoes de widget e de WhatsApp dividem a mesma tabela, e um erro
 * que distinguisse "formato invalido" de "nao existe" transformaria estas rotas publicas num
 * verificador de numero de telefone.
 */
export class WidgetSessionNotFoundError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.conversation.NOT_FOUND,
      message: 'Conversa nao encontrada',
      statusCode: NOT_FOUND,
    });
  }
}
