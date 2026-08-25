/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

const SECONDS_PER_DAY = 86_400;
const REFRESH_TOKEN_DAYS = 7;

export const REFRESH_TOKEN_TTL_SECONDS = REFRESH_TOKEN_DAYS * SECONDS_PER_DAY;

/**
 * O refresh token viaja em cookie `HttpOnly`, nunca no corpo lido por JavaScript.
 *
 * O caminho restrito e parte da defesa: o cookie so acompanha as rotas que o renovam ou o
 * derrubam, entao nenhuma outra rota do painel o carrega sem precisar.
 */
export const REFRESH_COOKIE_NAME = 'ada_refresh';
export const REFRESH_COOKIE_PATH = '/v1/auth';

/**
 * Companheiro do refresh que diz APENAS se o lembrar-me estava marcado.
 *
 * Sem ele, a rota de renovacao nao teria como saber que politica reemitir: o navegador manda o
 * valor do cookie, nunca o `Max-Age` dele — e reemitir persistente por padrao promoveria em
 * silencio um login de maquina emprestada a sessao de sete dias.
 *
 * Nao e `HttpOnly` de proposito: nao guarda segredo nenhum, so um booleano, e ele acompanha a vida
 * do refresh. Adulterar esse cookie nao da acesso a nada — no maximo muda quando a PROPRIA sessao
 * de quem adulterou expira.
 */
export const REMEMBER_COOKIE_NAME = 'ada_remember';

export const AUTH_SCHEME = 'Bearer';

export const ACCESS_TOKEN_ISSUER = 'ada-api';
export const ACCESS_TOKEN_AUDIENCE = 'ada-panel';
