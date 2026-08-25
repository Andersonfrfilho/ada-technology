/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { localCredentialsSchema } from '@ada/user-sdk';
import { z } from 'zod';

/**
 * Mesmas regras de `localCredentialsSchema` do `@ada/user-sdk` (teto de senha incluso: sem ele, um
 * corpo de megabytes vira um argon2 sobre megabytes, e uma rota de login sem sessao alguma derruba
 * a API). O alias existe so para o nome do dominio (`agent`) continuar aparecendo no import deste
 * modulo.
 */
export const agentLoginSchema = localCredentialsSchema.extend({
  /**
   * Lembrar-me: decide a VIDA DO COOKIE, nao a do token.
   *
   * Marcado, o refresh vira cookie persistente e a sessao sobrevive a fechar o navegador. Desmarcado
   * — o padrao — o cookie e de sessao e morre com a janela, que e o que se espera de uma maquina
   * emprestada. O token no Redis expira no mesmo prazo nos dois casos: quem some e o cookie, e um
   * refresh sem cookie nao renova nada.
   */
  rememberMe: z.boolean().default(false),
});
