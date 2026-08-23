/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { createEmailProvider } from '@adatechnology/email-provider';
import { EMAIL_DRIVER } from '@adatechnology/notification-contracts';
import type { EmailDriverPort } from '@adatechnology/user-contracts';

import { environment } from '@/infra/config/environment';

/**
 * Qual driver sobe e uma decisao de ambiente, nao de codigo: em dev o SMTP aponta para o Mailpit do
 * `infra/docker-compose.yml` (nada sai da maquina), em staging para um Mailpit proprio, e em
 * producao para Resend ou SES. `EMAIL_DRIVER` vazio devolve `undefined` — capacidade por ausencia,
 * e o `user-module` responde com `hasEmail: false`.
 *
 * O tipo devolvido e o `EmailDriverPort` do `user-contracts`, que e estruturalmente identico ao do
 * `notification-contracts` (garantido por teste de tipo no proprio pacote) — por isso nao ha
 * adapter aqui.
 */
export function createConfiguredEmailDriver(): EmailDriverPort | undefined {
  const from = environment.EMAIL_FROM;

  switch (environment.EMAIL_DRIVER) {
    case EMAIL_DRIVER.SMTP:
      return createEmailProvider({ driver: EMAIL_DRIVER.SMTP, from, smtpUrl: environment.EMAIL_SMTP_URL });
    case EMAIL_DRIVER.RESEND:
      return createEmailProvider({ driver: EMAIL_DRIVER.RESEND, from, apiKey: environment.EMAIL_RESEND_API_KEY });
    case EMAIL_DRIVER.SES:
      return createEmailProvider({ driver: EMAIL_DRIVER.SES, from, region: environment.EMAIL_SES_REGION });
    default:
      return undefined;
  }
}
