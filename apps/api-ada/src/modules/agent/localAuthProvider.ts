/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { createLocalAuthProvider, type AuthProviderInterface, type LocalCredentials } from '@ada/user-sdk';

import type { AuthenticateAgentUseCase } from '@/modules/agent/authenticateAgent.use-case';

/**
 * Ponto de extensao para provedores de auth: registrado em `container.ts`, mas os handlers de
 * `agent.controller.ts` continuam chamando `authenticateAgent` diretamente nesta entrega. Nada no
 * caminho de login em producao passa por aqui ainda.
 */
export function createLocalAgentAuthProvider(
  authenticateAgent: AuthenticateAgentUseCase,
): AuthProviderInterface<LocalCredentials> {
  return createLocalAuthProvider('local', {
    authenticate: ({ credentials, ipAddress }) =>
      authenticateAgent.execute({ email: credentials.email, password: credentials.password, ipAddress }),
  });
}
