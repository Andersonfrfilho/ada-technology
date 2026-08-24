/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/** Prefixo das rotas do modulo. Como no catalogo e na agenda, o painel e o unico consumidor. */
export const NOTIFICATION_BASE_PATH = '/v1/panel/notification';

/**
 * Escopo devolvido ao despachante do modulo para quem e admin do painel.
 *
 * As rotas de template e de politica de categoria sao `admin` e hoje nao declaram
 * `requiredScopes` — a barreira real e o `auth: ADMIN` da rota-ponte. O escopo viaja mesmo assim
 * para o dia em que o pacote declarar, sem o painel descobrir por 403 em producao.
 */
export const NOTIFICATION_ADMIN_SCOPE = 'notification:admin';

/** Idioma e fuso do produto, os mesmos que a agenda ja assume para o time daqui. */
export const NOTIFICATION_DEFAULT_LOCALE = 'pt-BR';
export const NOTIFICATION_DEFAULT_TIMEZONE = 'America/Sao_Paulo';

/**
 * Assunto e chave de template da redefinicao de senha.
 *
 * A categoria e o vocabulario que o painel mostra em "Roteamento"; a chave e o que o
 * `sendNotification` procura na tabela de templates. Ambas sao string estavel: elas entram no
 * historico de entrega e na politica de canal, e renomear depois quebra conversa em andamento
 * (`code-standart.md` §16 — literal repetido vira constante).
 */
export const NOTIFICATION_CATEGORY_AUTH = 'auth.password_reset';
export const NOTIFICATION_TEMPLATE_PASSWORD_RESET = 'auth.password_reset';
