/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { z } from 'zod';

import { APP_ENVIRONMENT } from '@/modules/shared/config/appEnvironment.constant';

/**
 * Separado de `environment.ts` para poder ser testado.
 *
 * `environment.ts` faz `parse` no carregamento do modulo — e essa e a graca dele —, entao importa-lo
 * de um teste falharia por falta das variaveis de build, e nao pelo que se quer verificar.
 */

/**
 * Ausente vira producao: variavel esquecida nao pode por "em obras" na frente do cliente.
 *
 * String vazia conta como ausente. `ARG VITE_APP_ENV` sem valor no Dockerfile vira `ENV
 * VITE_APP_ENV=`, e o Vite inlina `''` — que o `.default()` do Zod nao cobre, porque ele so dispara
 * para `undefined`. Sem este preprocess o `parse` lanca no carregamento do modulo e deixa o painel
 * inteiro numa tela branca, por causa de uma faixa que producao nem desenha.
 */
export const appEnvironmentSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.nativeEnum(APP_ENVIRONMENT).default(APP_ENVIRONMENT.PRODUCTION),
);

export const environmentSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_APP_ENV: appEnvironmentSchema,
});
