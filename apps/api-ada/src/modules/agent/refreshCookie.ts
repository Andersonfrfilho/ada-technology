/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { environment } from '@/infra/config/environment';
import {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  REMEMBER_COOKIE_NAME,
} from '@/modules/agent/agent.constant';

const IS_LOCAL_HTTP = environment.NODE_ENV === 'development';

// O painel roda em dominio proprio, entao o cookie precisa atravessar sites — e `SameSite=None`
// so vale acompanhado de `Secure`. Em desenvolvimento o `http://localhost` recusaria um cookie
// `Secure`, e ali `Lax` basta porque nao ha outro site chamando a API.
const SAME_SITE = IS_LOCAL_HTTP ? 'Lax' : 'None';
const SECURE_FLAG = IS_LOCAL_HTTP ? '' : '; Secure';

type BuildRefreshCookieParams = {
  readonly token: string;
  /**
   * Ausente, o cookie sai SEM `Max-Age`: cookie de sessao, que o navegador descarta ao fechar. E o
   * lado desmarcado do lembrar-me, e a diferenca esta so aqui — o token no Redis expira igual.
   */
  readonly maxAgeSeconds?: number | undefined;
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
    ...(maxAgeSeconds === undefined ? [] : [`Max-Age=${maxAgeSeconds}`]),
    'HttpOnly',
    `SameSite=${SAME_SITE}`,
  ].join('; ') + SECURE_FLAG;
}

/** O companheiro que registra a escolha do lembrar-me, para a renovacao reemitir a mesma politica. */
export function buildRememberCookie(maxAgeSeconds: number | undefined): string {
  return [
    `${REMEMBER_COOKIE_NAME}=${maxAgeSeconds === undefined ? '0' : '1'}`,
    `Path=${REFRESH_COOKIE_PATH}`,
    ...(maxAgeSeconds === undefined ? [] : [`Max-Age=${maxAgeSeconds}`]),
    `SameSite=${SAME_SITE}`,
  ].join('; ') + SECURE_FLAG;
}

/** `true` so quando o login marcou lembrar-me; ausencia e o padrao seguro. */
export function readRememberCookie(request: Request): boolean {
  return readCookie(request, REMEMBER_COOKIE_NAME) === '1';
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
  return readCookie(request, REFRESH_COOKIE_NAME);
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) return undefined;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;

    if (part.slice(0, separator).trim() !== name) continue;

    const value = part.slice(separator + 1).trim();
    return value.length > 0 ? value : undefined;
  }

  return undefined;
}
