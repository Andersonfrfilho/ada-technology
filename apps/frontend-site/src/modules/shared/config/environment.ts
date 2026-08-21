/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { environmentSchema } from '@/modules/shared/config/environment.schema';

/**
 * Falha no carregamento do modulo, e nao na primeira chamada HTTP.
 *
 * `VITE_*` e inlinado no bundle: um valor ausente vira `undefined` em producao e so apareceria como
 * uma requisicao para "undefined/v1/...". Validar aqui transforma isso em erro de build/boot.
 */
export const environment = environmentSchema.parse(import.meta.env);
