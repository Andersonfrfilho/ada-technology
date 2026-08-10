/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { QueryClient } from '@tanstack/react-query';

const STALE_TIME_MS = 30_000;

/**
 * Uma instancia por aplicacao, fora do componente.
 *
 * Sem `retry`, a resposta 401 nao vira quatro tentativas: o cliente HTTP ja renova a sessao uma vez
 * por conta e, se ainda falhar, insistir so atrasa a volta para o login.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});
