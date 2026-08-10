/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { useEffect } from 'react';

import { restoreSession } from '@/modules/auth/auth.api';
import { useSessionStore } from '@/modules/shared/session/session.store';
import type { SessionStatus } from '@/modules/shared/session/types/session.types';

/**
 * Sincroniza com o cookie do navegador, que e sistema externo — dai o efeito.
 *
 * Roda uma vez, no boot: enquanto o status e `unknown` a tela nao decide nada, porque mostrar o login
 * para quem tem sessao valida seria um piscar a cada F5.
 */
export function useRestoredSession(): SessionStatus {
  const status = useSessionStore((state) => state.status);
  const signIn = useSessionStore((state) => state.signIn);
  const markAnonymous = useSessionStore((state) => state.markAnonymous);

  useEffect(() => {
    if (status !== 'unknown') return;

    let isMounted = true;

    restoreSession()
      .then((session) => {
        if (isMounted) signIn(session);
      })
      .catch(() => {
        if (isMounted) markAnonymous();
      });

    return () => {
      isMounted = false;
    };
  }, [status, signIn, markAnonymous]);

  return status;
}
