/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { buildPreviewPayload } from '@adatechnology/notification-contracts';
import { z } from 'zod';

import { environment } from '@/infra/config/environment';
import { database } from '@/infra/database/client';
import { notificationModule } from '@/infra/container';
import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { jsonData } from '@/infra/http/responses';
import { AUTH_REQUIREMENT, HTTP_METHOD } from '@/infra/http/router';
import type { Route } from '@/infra/http/router';
import { NOTIFICATION_TEMPLATE_TEST_PATH } from '@/modules/notification/notification.constant';
import {
  NotificationTestRecipientUnknownError,
  NotificationTestTemplateUnknownError,
} from '@/modules/notification/notificationAttachment.error';
import { NOTIFICATION_TEMPLATE_VARIABLES } from '@/modules/notification/passwordResetTemplate.constant';
import { DrizzleAgentRepository } from '@/modules/agent/DrizzleAgentRepository';
import { UserRepository } from '@adatechnology/user-module';

const agents = new DrizzleAgentRepository();
const users = new UserRepository(database as never);

/**
 * O painel autentica pelo sistema `agents`; o destinatario de notificacao vive na tabela do
 * `user-module`. Sao dois sistemas em paralelo nesta fase, e o `agentId` do token NAO e um
 * `user.id` — passa-lo direto faz o modulo recusar por "destinatario sem endereco".
 *
 * A ponte e o e-mail, que e o que os dois lados tem em comum. Mesmo caminho que o
 * `passwordResetNotifier` ja usa, e pelo mesmo motivo.
 */
async function resolveRecipientUserId(agentId: string): Promise<string | undefined> {
  const agent = await agents.findById(agentId);
  if (!agent) return undefined;

  const user = await users.findByEmail({ companyId: undefined, email: agent.email });
  return user?.id;
}

const testBodySchema = z.object({
  /** Sem canal, vai por e-mail: e o unico com driver, e o teste existe para provar que chega. */
  channel: z.enum(['email', 'whatsapp', 'sms', 'push', 'inbox']).default('email'),
});

/**
 * Manda a mensagem de teste PARA QUEM PEDIU, e so.
 *
 * O destinatario e o agente autenticado — nao ha campo de destino no corpo, de proposito. Uma rota
 * de "enviar teste" que aceita endereco livre e um canhao de spam com a reputacao do dominio de
 * voces: qualquer operador do painel poderia disparar para qualquer pessoa, com texto que ele mesmo
 * acabou de escrever, e a trilha diria que foi o produto.
 *
 * O payload sai do catalogo de variaveis (`buildPreviewPayload`), o mesmo que alimenta o preview da
 * tela. Entao o teste prova exatamente o que o preview mostra — e a divergencia entre os dois, se
 * houver, aparece aqui em vez de aparecer no cliente.
 *
 * A categoria e a propria chave do template: e a convencao deste host (`auth.password_reset` e
 * `auth.login_alert` sao os dois iguais). Um template com categoria diferente da chave precisaria de
 * um mapa, e nao ha nenhum hoje.
 */
const sendTestRoute: Route = {
  method: HTTP_METHOD.POST,
  path: NOTIFICATION_TEMPLATE_TEST_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.NOTIFICATION_TEST_SEND,
  handler: async ({ request, params, agent }) => {
    const templateKey = params.key ?? '';
    const variables = NOTIFICATION_TEMPLATE_VARIABLES[templateKey as keyof typeof NOTIFICATION_TEMPLATE_VARIABLES];

    // Chave fora do catalogo do host: recusa em vez de disparar uma notificacao que nenhum template
    // atende — o modulo lancaria `TemplateNotFoundError`, e o painel receberia um 500 sem causa.
    if (!variables) throw new NotificationTestTemplateUnknownError(templateKey);

    const body = testBodySchema.parse(await request.json().catch(() => ({})));

    const recipientUserId = await resolveRecipientUserId(agent?.agentId ?? '');
    if (!recipientUserId) throw new NotificationTestRecipientUnknownError();

    const result = await notificationModule.useCases.sendNotification.execute({
      companyId: environment.ADA_COMPANY_ID,
      recipientUserId,
      category: templateKey,
      templateKey,
      payload: buildPreviewPayload(variables),
      channels: [body.channel],
    });

    return jsonData({ notificationId: result.notificationId, deliveries: result.deliveries });
  },
};

export const notificationTestRoutes: readonly Route[] = [sendTestRoute];
