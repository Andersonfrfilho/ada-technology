/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/**
 * Fora de `/v1`: o painel nao e API do produto, e nao deve aparecer junto das rotas versionadas de
 * quem consome a API.
 */
export const BULL_BOARD_BASE_PATH = '/ops/queue';

/**
 * ASCII puro, sem travessao nem acento.
 *
 * O realm vai para o `WWW-Authenticate`, e cabecalho HTTP e ASCII por definicao — o `Bun.serve`
 * recusa o valor inteiro e a resposta 401 vira 500. Descoberto batendo na rota sem credencial.
 */
export const BULL_BOARD_REALM = 'Ada - fila de notificacao';
