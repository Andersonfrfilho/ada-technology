/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { AUTH_PATH, HTTP_METHOD } from '@/modules/shared/http/http.constant';
import { panelRequest } from '@/modules/shared/http/panelHttpClient';
import type { PanelSession } from '@/modules/shared/session/types/session.types';

export type SignInParams = {
  readonly email: string;
  readonly password: string;
};

export async function signInAgent({ email, password }: SignInParams): Promise<PanelSession> {
  return panelRequest<PanelSession>({
    path: AUTH_PATH.LOGIN,
    method: HTTP_METHOD.POST,
    body: { email, password },
  });
}

export async function signOutAgent(): Promise<void> {
  await panelRequest<void>({ path: AUTH_PATH.LOGOUT, method: HTTP_METHOD.POST });
}

/**
 * Reabre a sessao no boot.
 *
 * O access token morre com o F5; o cookie de refresh nao. Chamar a rota de renovacao e a unica forma
 * de saber se ainda ha sessao, porque o cookie e `HttpOnly` e a pagina nao consegue olhar para ele.
 */
export async function restoreSession(): Promise<PanelSession> {
  return panelRequest<PanelSession>({ path: AUTH_PATH.REFRESH, method: HTTP_METHOD.POST });
}
