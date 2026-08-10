/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { create } from 'zustand';

import type { SessionState } from '@/modules/shared/session/types/session.types';

/**
 * O access token vive so aqui, em memoria.
 *
 * `localStorage` sobrevive a aba, ao logout e ao XSS; recarregar a pagina reabre a sessao pelo cookie
 * `HttpOnly` de refresh, que o script da pagina nao consegue ler. Perder o token no F5 e o
 * comportamento correto, nao um incomodo a contornar.
 */
export const useSessionStore = create<SessionState>((set) => ({
  status: 'unknown',
  signIn: ({ accessToken, agent }) => set({ status: 'authenticated', accessToken, agent }),
  signOut: () => set({ status: 'anonymous', accessToken: undefined, agent: undefined }),
  markAnonymous: () => set({ status: 'anonymous', accessToken: undefined, agent: undefined }),
}));
