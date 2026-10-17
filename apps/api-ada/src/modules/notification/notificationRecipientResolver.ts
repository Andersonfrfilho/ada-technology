/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { RecipientResolverPort, ResolvedRecipient } from '@adatechnology/notification-contracts';
import { UserRepository } from '@adatechnology/user-module';

import { database } from '@/infra/database/client';
import { DrizzleAgentRepository } from '@/modules/agent/DrizzleAgentRepository';
import {
  NOTIFICATION_DEFAULT_LOCALE,
  NOTIFICATION_DEFAULT_TIMEZONE,
} from '@/modules/notification/notification.constant';

const users = new UserRepository(database as never);
const agents = new DrizzleAgentRepository();

/**
 * O endereco do destinatario, lido da tabela do `user-module` no instante do envio.
 *
 * O modulo de notificacao nao conhece — e nunca le — a tabela de usuarios do host: e isso que
 * permite a ele jamais persistir e-mail em claro. Esta porta e a unica ponte entre os dois.
 *
 * O `companyId` do modulo e ignorado de proposito na consulta: o `user-module` roda em
 * `tenancy.mode: 'single'` neste produto, e nesse modo ele grava `company_id` NULO — filtrar pelo
 * `ADA_COMPANY_ID` nao acharia usuario nenhum. Nao ha vazamento entre tenants aqui porque so
 * existe um, e ele vem do ambiente, nunca do cliente (`security.md` §2).
 *
 * Sem telefone na tabela, so o e-mail e resolvido — que e o unico canal ligado neste host.
 *
 * DUAS TABELAS, enquanto os dois sistemas convivem. O painel autentica pelo `agents` legado e o
 * `user-module` roda em paralelo; um atendente pode existir so de um lado. Procurar apenas em
 * `users` fazia TODA notificacao para quem so existe em `agents` morrer em "destinatario sem
 * endereco" — em silencio, porque o modulo pula o canal sem erro.
 *
 * A ordem importa: `users` primeiro, porque e para la que o produto esta migrando e e la que o
 * cadastro fica completo. `agents` e a rede que impede o periodo de convivencia de calar aviso de
 * seguranca e redefinicao de senha.
 *
 * Quando o `agents` sair, some o segundo `if` e nada mais muda.
 */
export const notificationRecipientResolver: RecipientResolverPort = {
  async resolve({ userId }): Promise<ResolvedRecipient | undefined> {
    const user = await users.findById({ companyId: undefined, id: userId });
    if (user) return toRecipient({ email: user.email, name: user.name });

    const agent = await agents.findById(userId);
    if (agent) return toRecipient({ email: agent.email, name: agent.name });

    return undefined;
  },
};

function toRecipient(params: { readonly email: string; readonly name: string }): ResolvedRecipient {
  return {
    email: params.email,
    displayName: params.name,
    locale: NOTIFICATION_DEFAULT_LOCALE,
    timezone: NOTIFICATION_DEFAULT_TIMEZONE,
  };
}
