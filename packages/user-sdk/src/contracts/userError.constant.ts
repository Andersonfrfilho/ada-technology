/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/**
 * Codigo estavel do envelope de erro do dominio de usuario — a mensagem e para gente, o codigo e
 * para codigo. Fonte unica para o backend (`ERROR_CODES.agent.*`) e o frontend
 * (`API_ERROR_CODE`), que hoje redeclaram um subconjunto cada um por conta propria.
 */
export const USER_ERROR_CODE = {
  INVALID_CREDENTIALS: 'AGENT_INVALID_CREDENTIALS',
  NOT_AUTHENTICATED: 'AGENT_NOT_AUTHENTICATED',
  NOT_AUTHORIZED: 'AGENT_NOT_AUTHORIZED',
  NOT_FOUND: 'AGENT_NOT_FOUND',
  EMAIL_ALREADY_EXISTS: 'AGENT_EMAIL_ALREADY_EXISTS',
  NETWORK_UNREACHABLE: 'NETWORK_UNREACHABLE',
} as const;

export type UserErrorCode = (typeof USER_ERROR_CODE)[keyof typeof USER_ERROR_CODE];
