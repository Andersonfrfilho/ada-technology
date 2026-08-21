/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { LocalCredentials } from '../contracts/localCredentials.schema';
import type { UserSession } from '../contracts/userSession.types';

/**
 * O que uma implementacao concreta do provedor local precisa saber fazer — o SDK nao acessa banco
 * nem hash de senha, so declara o contrato. Cada app injeta a propria logica (hoje,
 * `AuthenticateAgentUseCase` em apps/api-ada) atras dessa interface.
 */
export type LocalAuthenticatorInterface = {
  authenticate(params: { readonly credentials: LocalCredentials; readonly ipAddress: string }): Promise<UserSession>;
};
