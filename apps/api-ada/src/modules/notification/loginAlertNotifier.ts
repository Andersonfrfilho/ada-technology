/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { NotificationModule } from '@adatechnology/notification-module';
import type { LoggerPort as UserLoggerPort, LoginSucceededEvent } from '@adatechnology/user-contracts';

import {
  NOTIFICATION_CATEGORY_LOGIN,
  NOTIFICATION_DEFAULT_LOCALE,
  NOTIFICATION_DEFAULT_TIMEZONE,
  NOTIFICATION_TEMPLATE_LOGIN_ALERT,
} from '@/modules/notification/notification.constant';

/**
 * O aviso de acesso a conta, disparado pelo hook `onLoginSucceeded` do `user-module`.
 *
 * **Sem `channels`, de proposito.** A redefinicao de senha forca e-mail porque e recuperacao de
 * acesso e precisa chegar por um caminho que o dono da conta certamente le. Aviso de login e
 * informativo: deixar o fan-out resolver pelas preferencias significa que, no dia em que um driver
 * de push ou de WhatsApp for injetado no `notification-module`, este aviso passa a sair por ele
 * sem uma linha mudar aqui — e quem nao quiser desliga na aba de Roteamento.
 *
 * **Nunca lanca.** Um login que falha porque o aviso falhou seria trocar um incomodo por uma porta
 * trancada. O erro vira log e o acesso segue.
 */
export function createLoginAlertNotifier(params: {
  readonly module: NotificationModule;
  readonly companyId: string;
  readonly passwordChangeUrl: string;
  readonly logger: UserLoggerPort;
  /** Injetavel so para teste: em producao e sempre o relogio do sistema. */
  readonly now?: () => Date;
}): (event: LoginSucceededEvent) => Promise<void> {
  const now = params.now ?? (() => new Date());

  return async function notifyLoginSucceeded(event: LoginSucceededEvent): Promise<void> {
    try {
      await params.module.useCases.sendNotification.execute({
        companyId: params.companyId,
        recipientUserId: event.userId,
        category: NOTIFICATION_CATEGORY_LOGIN,
        templateKey: NOTIFICATION_TEMPLATE_LOGIN_ALERT,
        payload: {
          signedInAt: formatSignedInAt(now()),
          ipAddress: event.ipAddress,
          passwordChangeUrl: params.passwordChangeUrl,
        },
      });
    } catch (error) {
      // Sem o e-mail no log: o `userId` opaco ja identifica a conta para quem investiga, e o IP e
      // dado pessoal (`security.md` §1).
      params.logger.warn('Aviso de acesso nao enviado', { userId: event.userId, error: String(error) });
    }
  };
}

/** Data no fuso e no idioma do produto — quem le e o titular da conta, nao o servidor. */
function formatSignedInAt(date: Date): string {
  return new Intl.DateTimeFormat(NOTIFICATION_DEFAULT_LOCALE, {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: NOTIFICATION_DEFAULT_TIMEZONE,
  }).format(date);
}
