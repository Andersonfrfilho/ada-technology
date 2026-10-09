/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import infraLocale from '@/modules/infra/infra.locale.json';
import { PanelApiError } from '@/modules/shared/http/http.error';

const ERROR_MESSAGES: Readonly<Record<string, string>> = infraLocale.errors;

/** A tela decide pelo codigo da API, nunca pela mensagem do servidor. */
export function resolveInfraErrorMessage(error: unknown): string {
  if (error instanceof PanelApiError) return ERROR_MESSAGES[error.code] ?? infraLocale.errors.UNKNOWN;

  return infraLocale.errors.UNKNOWN;
}
