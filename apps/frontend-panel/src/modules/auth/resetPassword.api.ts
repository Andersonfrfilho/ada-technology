/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { AGENTS_PATH } from '@/modules/agents/agents.constant';
import { HTTP_METHOD } from '@/modules/shared/http/http.constant';
import { panelRequest } from '@/modules/shared/http/panelHttpClient';

/**
 * Rota publica: quem chega aqui nao tem sessao, e o token do e-mail e a credencial.
 *
 * Nao passa pelo caminho autenticado do `panelRequest` — nao ha token de acesso para anexar, e
 * tentar renovar sessao no meio de uma redefinicao levaria a pessoa de volta ao login.
 */
export async function confirmPasswordReset(params: {
  readonly token: string;
  readonly password: string;
}): Promise<void> {
  await panelRequest<void>({
    path: `${AGENTS_PATH}/password-reset/confirm`,
    method: HTTP_METHOD.POST,
    body: params,
    anonymous: true,
  });
}
