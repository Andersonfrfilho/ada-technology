/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/**
 * `OAUTH2` e `OIDC` sao pontos de extensao tipados, sem provedor concreto implementado ainda —
 * so `LOCAL` (email/senha) existe hoje. Adicionar um provedor externo e escolher entre esses dois
 * tipos, nao inventar um terceiro.
 */
export const AUTH_PROVIDER_TYPE = {
  LOCAL: 'local',
  OAUTH2: 'oauth2',
  OIDC: 'oidc',
} as const;

export type AuthProviderType = (typeof AUTH_PROVIDER_TYPE)[keyof typeof AUTH_PROVIDER_TYPE];
