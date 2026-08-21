/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { UserSession } from '../contracts/userSession.types';
import type { AuthProviderType } from './authProviderType.constant';

export type AuthenticateWithProviderParams<TCredentials> = {
  readonly credentials: TCredentials;
  readonly ipAddress: string;
};

/**
 * O contrato que todo provedor de autenticacao implementa, local ou externo.
 *
 * `authenticate` devolve o `UserSession` ja pronto — quem chama nao precisa saber se por tras
 * houve consulta a senha com hash, troca de codigo OAuth por token, ou validacao de id_token OIDC.
 * Provedores baseados em claim externa usam `resolveAttributeMapping` (attributeMapping.types.ts)
 * dentro da propria implementacao para montar o `UserProfile` a partir da resposta do IdP.
 */
export type AuthProviderInterface<TCredentials = unknown> = {
  readonly id: string;
  readonly type: AuthProviderType;
  authenticate(params: AuthenticateWithProviderParams<TCredentials>): Promise<UserSession>;
};
