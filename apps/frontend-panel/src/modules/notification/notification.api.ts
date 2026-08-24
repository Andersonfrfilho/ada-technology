/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { createNotificationClient, type NotificationClient } from '@adatechnology/notification-client';

import { environment } from '@/modules/shared/config/environment';
import { useSessionStore } from '@/modules/shared/session/session.store';

/**
 * Diferente do `scheduling.api.ts`, este modulo nao reimplementa a chamada HTTP em cima de
 * `panelRequest`: o `@adatechnology/notification-client` ja e o cliente tipado das 13 rotas do
 * pacote, com envelope proprio (`data`/`pagination`/`meta`) que nao bate com o formato de paginacao
 * de `panelListRequest` (`total`/`page`/`pageSize`). Reescrever isso a mao seria duplicar o que o
 * pacote publicado ja faz — `code-standards.md` (DRY) e `pluggable-module.md` (nao remontar o que a
 * lib entrega pronta).
 *
 * A autenticacao continua a mesma do resto do painel: o Bearer sai do `sessionStore`, nunca de um
 * token capturado no boot — o cliente chama `getAuthHeaders` a cada requisicao.
 *
 * `NOTIFICATION_API_BASE_PATH` segue a mesma convencao de `SCHEDULING_BASE_PATH`: o modulo monta
 * as proprias rotas sob um prefixo, e o cliente do pacote as chama sem prefixo nenhum
 * (`/notification-templates`, `/notifications`, ...) — quem soma o prefixo e este arquivo, uma vez.
 */
const NOTIFICATION_API_BASE_PATH = '/v1/panel/notification';

export const notificationApi: NotificationClient = createNotificationClient({
  baseUrl: `${environment.VITE_API_BASE_URL}${NOTIFICATION_API_BASE_PATH}`,
  getAuthHeaders: () => {
    const { accessToken } = useSessionStore.getState();
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  },
});
