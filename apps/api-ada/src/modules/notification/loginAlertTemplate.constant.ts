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
  NOTIFICATION_TEMPLATE_LOGIN_ALERT,
} from '@/modules/notification/notification.constant';

/**
 * O texto do aviso de acesso a conta.
 *
 * Como o da redefinicao, este e so o default de boot: a partir do primeiro `upsert` pelo painel o
 * texto muda sem deploy, e a versao anterior fica legivel para auditoria.
 *
 * O aviso existe para quem NAO reconhece o acesso, entao ele termina numa acao — trocar a senha —
 * e nao num "se foi voce, ignore". Aviso que so informa e aviso que ninguem le.
 */
export const LOGIN_ALERT_TEMPLATE = {
  key: NOTIFICATION_TEMPLATE_LOGIN_ALERT,
  channel: 'email',
  locale: NOTIFICATION_DEFAULT_LOCALE,
  subject: 'Novo acesso a sua conta',
  body: [
    'Sua conta foi acessada agora, em {{signedInAt}}, a partir do endereco {{ipAddress}}.',
    '',
    'Se foi voce, nao precisa fazer nada.',
    '',
    'Se nao foi, troque a senha agora em {{passwordChangeUrl}} — quem entrou continua dentro ate voce trocar.',
  ].join('\n'),
  active: true,
} as const;

/**
 * O IP entra no texto porque e a unica pista que o dono da conta tem para reconhecer o acesso.
 *
 * Isto NAO contradiz o `security.md` §1, que proibe PII em log: ali o risco e um dado pessoal
 * espalhado por sistema de observabilidade que meio time le. Aqui e conteudo de mensagem, e o
 * destinatario e o proprio titular do dado.
 */
export const LOGIN_ALERT_VARIABLES: readonly TemplateVariableDefinition[] = [
  { name: 'signedInAt', example: '25/08/2026 as 09:14', required: true },
  { name: 'ipAddress', example: '187.45.10.22', required: true },
  {
    name: 'passwordChangeUrl',
    example: 'https://painel.adatechnology.com.br/perfil/senha',
    required: true,
  },
];
