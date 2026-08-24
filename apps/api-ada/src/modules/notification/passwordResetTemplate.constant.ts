/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { TemplateVariableDefinition } from '@adatechnology/notification-contracts';

import {
  NOTIFICATION_DEFAULT_LOCALE,
  NOTIFICATION_TEMPLATE_PASSWORD_RESET,
} from '@/modules/notification/notification.constant';

/**
 * O texto que a pessoa le quando pede para redefinir a senha.
 *
 * Vem do host e nao do pacote: copy e regra de negocio, e o `notification-module` nao inventa
 * conteudo. Isto e so o default de boot — a partir do primeiro `upsert` pelo painel, o texto muda
 * sem deploy, e a versao anterior fica legivel para auditoria.
 *
 * Portado do `buildDefaultPasswordResetEmail` do `@adatechnology/user-module`, que montava a
 * string em codigo e so mudava com publicacao de pacote.
 */
export const PASSWORD_RESET_TEMPLATE = {
  key: NOTIFICATION_TEMPLATE_PASSWORD_RESET,
  channel: 'email',
  locale: NOTIFICATION_DEFAULT_LOCALE,
  subject: 'Redefinicao de senha',
  body: [
    'Recebemos um pedido para redefinir a senha da sua conta.',
    '',
    'Acesse {{resetUrl}} para escolher uma senha nova.',
    '',
    'Se nao foi voce, ignore este e-mail: a senha atual continua valendo.',
  ].join('\n'),
  active: true,
} as const;

/**
 * As variaveis que esta notificacao promete no payload.
 *
 * Alimenta a validacao do `upsert` (o painel recusa `{{campo}}` fora desta lista) e a lista
 * clicavel do editor. Sem isto, alguem digita `{{link}}` onde o envio manda `{{resetUrl}}`, o
 * renderer devolve string vazia — comportamento correto — e o e-mail sai com um buraco no lugar do
 * link, sem log e sem erro. Numa notificacao de recuperacao de conta, isso e a pessoa sem conseguir
 * voltar.
 */
export const PASSWORD_RESET_VARIABLES: readonly TemplateVariableDefinition[] = [
  {
    name: 'resetUrl',
    example: 'https://painel.adatechnology.com.br/redefinir-senha?token=exemplo',
    required: true,
  },
];

export const NOTIFICATION_TEMPLATE_VARIABLES = {
  [NOTIFICATION_TEMPLATE_PASSWORD_RESET]: PASSWORD_RESET_VARIABLES,
} as const;
