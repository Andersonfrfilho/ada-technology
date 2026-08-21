/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { LocalCredentials } from '../contracts/localCredentials.schema';
import type { AuthProviderInterface } from './authProvider.types';
import { AUTH_PROVIDER_TYPE } from './authProviderType.constant';
import type { LocalAuthenticatorInterface } from './localAuthenticator.types';

/** Adapta um `LocalAuthenticatorInterface` (a logica de dominio do app) para o `AuthProviderInterface`
 * generico do SDK, para que o provedor local entre no mesmo mapa de dispatch que um provedor
 * externo entraria no futuro. */
export function createLocalAuthProvider(
  id: string,
  authenticator: LocalAuthenticatorInterface,
): AuthProviderInterface<LocalCredentials> {
  return {
    id,
    type: AUTH_PROVIDER_TYPE.LOCAL,
    authenticate: (params) => authenticator.authenticate(params),
  };
}
