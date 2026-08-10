/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { verifyAccessToken } from '@/modules/agent/accessToken';
import { AUTH_SCHEME } from '@/modules/agent/agent.constant';
import type { AuthenticatedAgent } from '@/modules/agent/types/agent.types';

const SCHEME_PREFIX = `${AUTH_SCHEME} `;

/**
 * Traduz o header `Authorization` no atendente que o router entrega ao controller.
 *
 * Nada e logado aqui: o header carrega o token inteiro, e um log de borda com ele vale tanto
 * quanto a senha. Header ausente e token invalido saem iguais — `undefined` — para que a resposta
 * nao ensine se o problema foi a forma ou o conteudo.
 */
export async function authenticateRequest(request: Request): Promise<AuthenticatedAgent | undefined> {
  const header = request.headers.get('authorization');
  if (!header?.startsWith(SCHEME_PREFIX)) return undefined;

  const token = header.slice(SCHEME_PREFIX.length).trim();
  if (!token) return undefined;

  return verifyAccessToken(token);
}
