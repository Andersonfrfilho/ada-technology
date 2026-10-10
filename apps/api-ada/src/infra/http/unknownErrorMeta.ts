/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { DrizzleQueryError } from 'drizzle-orm';

import { scrubSecretValues } from '@/shared/redaction';

type DriverCause = { readonly code: string };

function isDriverCause(value: unknown): value is DriverCause {
  return typeof value === 'object' && value !== null && 'code' in value && typeof value.code === 'string';
}

function resolveDriverCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  return isDriverCause(error.cause) ? error.cause.code : undefined;
}

/**
 * Meta do log do erro desconhecido.
 *
 * `message`, `query` e `params` de erro do Drizzle trazem os parametros da consulta (texto cifrado,
 * dica do token): para esse erro, so o nome e o `code` do driver Postgres saem. O resto mantem message e stack.
 */
export function buildUnknownErrorMeta(error: unknown): Record<string, unknown> {
  const driverCode = resolveDriverCode(error);

  if (error instanceof DrizzleQueryError || driverCode !== undefined) {
    return {
      errorName: error instanceof Error ? error.constructor.name : typeof error,
      ...(driverCode !== undefined ? { causeCode: driverCode } : {}),
    };
  }

  return {
    errorName: error instanceof Error ? error.name : typeof error,
    errorMessage: scrubSecretValues(error instanceof Error ? error.message : String(error)),
    stack: error instanceof Error && error.stack !== undefined ? scrubSecretValues(error.stack) : undefined,
  };
}
