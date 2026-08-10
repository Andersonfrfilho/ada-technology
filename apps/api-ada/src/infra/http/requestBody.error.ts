/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { AppError } from '@/shared/errors/AppError';
import { ERROR_CODES } from '@/shared/errors/codes';

const BAD_REQUEST = 400;

/**
 * Corpo que o parser de JSON nao consegue ler.
 *
 * Sem esta classe o `SyntaxError` do parser sobe cru ate o filtro global e vira 500 — resposta que
 * culpa o servidor por um corpo malformado do cliente, e que faz cliente com retry automatico
 * reenviar o mesmo corpo invalido achando que a falha foi passageira.
 */
export class InvalidJsonBodyError extends AppError {
  constructor() {
    super({
      code: ERROR_CODES.shared.VALIDATION_FAILED,
      message: 'Corpo da requisicao nao e JSON valido',
      statusCode: BAD_REQUEST,
    });
  }
}
