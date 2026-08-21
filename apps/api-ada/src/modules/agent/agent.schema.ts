/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { localCredentialsSchema } from '@ada/user-sdk';

/**
 * Mesmas regras de `localCredentialsSchema` do `@ada/user-sdk` (teto de senha incluso: sem ele, um
 * corpo de megabytes vira um argon2 sobre megabytes, e uma rota de login sem sessao alguma derruba
 * a API). O alias existe so para o nome do dominio (`agent`) continuar aparecendo no import deste
 * modulo.
 */
export const agentLoginSchema = localCredentialsSchema;
