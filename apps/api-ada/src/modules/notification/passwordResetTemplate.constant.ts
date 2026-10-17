/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { TemplateVariableDefinition } from '@adatechnology/notification-contracts';

import { LOGIN_ALERT_VARIABLES } from '@/modules/notification/loginAlertTemplate.constant';
import {
  NOTIFICATION_DEFAULT_LOCALE,
  NOTIFICATION_TEMPLATE_LOGIN_ALERT,
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

/**
 * Anexo OPCIONAL, disponivel em qualquer template deste host.
 *
 * `required: false` e o que faz isto nao ser mentira: no disparo normal a chave nao vem no payload,
 * `resolveEmailAttachments` a ignora em silencio, e nada muda. Quem preenche e o envio de teste,
 * onde o operador escolhe um arquivo para provar que a cadeia inteira funciona — upload, assinatura,
 * download pelo driver e MIME.
 *
 * Declarar um anexo `required` num template exigiria saber QUAL notificacao do produto carrega
 * arquivo, e isso e decisao de negocio. Enquanto ela nao existe, a capacidade fica disponivel sem
 * prometer nada.
 */
export const OPTIONAL_ATTACHMENT_VARIABLE: TemplateVariableDefinition = {
  name: 'anexo',
  example: 'documento.pdf',
  required: false,
  kind: 'attachment',
};

export const NOTIFICATION_TEMPLATE_VARIABLES = {
  [NOTIFICATION_TEMPLATE_PASSWORD_RESET]: [...PASSWORD_RESET_VARIABLES, OPTIONAL_ATTACHMENT_VARIABLE],
  [NOTIFICATION_TEMPLATE_LOGIN_ALERT]: [...LOGIN_ALERT_VARIABLES, OPTIONAL_ATTACHMENT_VARIABLE],
} as const;
