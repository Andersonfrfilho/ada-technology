/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { validateEmailHtml } from '@ada/email-layout';
import { NotificationProvider, NotificationSettingsWorkspace } from '@adatechnology/notification-ui';

import { notificationApi } from '@/modules/notification/notification.api';
import { NOTIFICATION_CATEGORIES, NOTIFICATION_CHANNELS } from '@/modules/notification/notification.constant';
import notificationLocale from '@/modules/notification/notification.locale.json';

/**
 * So a aba de configuracoes: este host tem UM canal (e-mail) e UMA notificacao real hoje
 * (redefinicao de senha). Nao ha inbox de destinatario a mostrar — quem recebe o e-mail e o
 * usuario final, nao um agente logado no painel — entao `NotificationsWorkspace` (a caixa de
 * entrada) nao se aplica aqui. Adicionar categorias e canais novos e questao de estender
 * `notification.constant.ts` quando o backend (`api-ada`) realmente os enviar — nao antes, senao a
 * tela promete um roteamento que nenhum envio cumpre.
 */
export function NotificationPage() {
  return (
    <section className="h-full min-h-0 overflow-y-auto">
      <NotificationProvider client={notificationApi} messageOverrides={notificationLocale}>
        <NotificationSettingsWorkspace
          channels={NOTIFICATION_CHANNELS}
          categories={NOTIFICATION_CATEGORIES}
          validateEmailHtml={validateEmailHtml}
        />
      </NotificationProvider>
    </section>
  );
}
