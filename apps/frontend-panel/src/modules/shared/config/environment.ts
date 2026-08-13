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
 * Falha no carregamento do modulo, e nao na primeira chamada HTTP.
 *
 * `VITE_*` e inlinado no bundle: um valor ausente vira `undefined` em producao e so apareceria como
 * uma requisicao para "undefined/v1/...". Validar aqui transforma isso em erro de build/boot.
 */
const environmentSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  /** Ausente vira producao: variavel esquecida nao pode por "em obras" na frente do cliente. */
  VITE_APP_ENV: z.nativeEnum(APP_ENVIRONMENT).default(APP_ENVIRONMENT.PRODUCTION),
});

export const environment = environmentSchema.parse(import.meta.env);
