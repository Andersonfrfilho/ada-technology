/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { MetaWhatsAppError } from '@adatechnology/meta-whatsapp-contracts';
import { ZodError } from 'zod';

import { isAppError } from '@/shared/errors/AppError';
import { ERROR_CODES } from '@/shared/errors/codes';
import { jsonError } from '@/infra/http/responses';
import { logger } from '@/shared/logger';

const SOURCE = 'infra.http.exceptionFilter';

export type HandleUncaughtErrorParams = {
  readonly error: unknown;
  readonly traceId: string;
  readonly path: string;
};

export function handleUncaughtError({ error, traceId, path }: HandleUncaughtErrorParams): Response {
  if (error instanceof ZodError) {
    // Todas as falhas de validacao de uma vez, nao so a primeira.
    const details = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    logger.warn({
      message: 'Requisicao rejeitada na validacao de entrada',
      source: SOURCE,
      traceId,
      meta: { path, issueCount: details.length },
    });

    return jsonError({
      code: ERROR_CODES.shared.VALIDATION_FAILED,
      message: 'Requisicao invalida',
      statusCode: 400,
      details,
    });
  }

  if (isAppError(error)) {
    logger.warn({
      message: error.message,
      source: SOURCE,
      traceId,
      meta: { path, code: error.code, statusCode: error.statusCode, ...error.context },
    });

    return jsonError({
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
    });
  }

  // O modulo tem hierarquia propria, fora de `AppError`: sem este ramo, assinatura invalida de
  // webhook viraria 500 e a Meta ficaria reentregando o mesmo evento achando que a falha e nossa.
  if (error instanceof MetaWhatsAppError) {
    logger.warn({
      message: error.message,
      source: SOURCE,
      traceId,
      meta: { path, code: error.code, statusCode: error.statusCode },
    });

    return jsonError({ code: error.code, message: error.message, statusCode: error.statusCode });
  }

  // Desconhecido: 500 generico, sem stack trace ao cliente. O stack fica no log.
  logger.error({
    message: 'Erro nao tratado',
    source: SOURCE,
    traceId,
    meta: {
      path,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    },
  });

  return jsonError({
    code: ERROR_CODES.shared.INTERNAL_ERROR,
    message: 'Erro interno do servidor',
    statusCode: 500,
  });
}
