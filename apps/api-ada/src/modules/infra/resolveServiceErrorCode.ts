/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { DomainError } from '@/shared/errors/AppError';
import { ERROR_CODES } from '@/shared/errors/codes';

/** So o `code` estavel sai daqui: a mensagem de um erro inesperado pode carregar dado que nao deve ser gravado. */
export function resolveServiceErrorCode(error: unknown): string {
  return error instanceof DomainError ? error.code : ERROR_CODES.shared.INTERNAL_ERROR;
}
