/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { environment } from '@/infra/config/environment';
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from '@/modules/agent/agent.constant';

const IS_LOCAL_HTTP = environment.NODE_ENV === 'development';

// O painel roda em dominio proprio, entao o cookie precisa atravessar sites — e `SameSite=None`
// so vale acompanhado de `Secure`. Em desenvolvimento o `http://localhost` recusaria um cookie
// `Secure`, e ali `Lax` basta porque nao ha outro site chamando a API.
const SAME_SITE = IS_LOCAL_HTTP ? 'Lax' : 'None';
const SECURE_FLAG = IS_LOCAL_HTTP ? '' : '; Secure';

type BuildRefreshCookieParams = {
  readonly token: string;
  readonly maxAgeSeconds: number;
};

/**
 * Monta o `Set-Cookie` do refresh token.
 *
 * `HttpOnly` e o ponto: um XSS no painel consegue ler o access token da memoria e usa-lo por
 * quinze minutos, mas nao alcanca o refresh, que e o que renovaria a sessao para sempre.
 */
export function buildRefreshCookie({ token, maxAgeSeconds }: BuildRefreshCookieParams): string {
  return [
    `${REFRESH_COOKIE_NAME}=${token}`,
    `Path=${REFRESH_COOKIE_PATH}`,
    `Max-Age=${maxAgeSeconds}`,
    'HttpOnly',
    `SameSite=${SAME_SITE}`,
  ].join('; ') + SECURE_FLAG;
}

/** Cookie vazio e expirado: o logout tira o token do navegador, nao so do Redis. */
export function buildExpiredRefreshCookie(): string {
  return buildRefreshCookie({ token: '', maxAgeSeconds: 0 });
}

/**
 * Le o refresh token do cabecalho `Cookie`.
 *
 * Feito na mao porque o valor e base64url, sem nenhum caractere que precise de decodificacao —
 * e porque uma dependencia a mais para partir string em ponto e virgula nao se paga.
 */
export function readRefreshCookie(request: Request): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) return undefined;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;

    if (part.slice(0, separator).trim() !== REFRESH_COOKIE_NAME) continue;

    const value = part.slice(separator + 1).trim();
    return value.length > 0 ? value : undefined;
  }

  return undefined;
}
