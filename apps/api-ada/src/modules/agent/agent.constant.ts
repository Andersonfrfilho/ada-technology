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

export const AUTH_SCHEME = 'Bearer';

export const ACCESS_TOKEN_ISSUER = 'ada-api';
export const ACCESS_TOKEN_AUDIENCE = 'ada-panel';
