/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { NOTIFICATION_CHANNEL, type EmailDriverPort } from '@adatechnology/notification-contracts';
import type { NotificationModule } from '@adatechnology/notification-module';
import type { LoggerPort as UserLoggerPort, PasswordResetRequestedEvent } from '@adatechnology/user-contracts';
import { UserRepository } from '@adatechnology/user-module';

import { database } from '@/infra/database/client';
import {
  NOTIFICATION_CATEGORY_AUTH,
  NOTIFICATION_TEMPLATE_PASSWORD_RESET,
} from '@/modules/notification/notification.constant';

const users = new UserRepository(database as never);

export type FindUserByEmail = (email: string) => Promise<{ readonly id: string } | undefined>;

const findUserByEmail: FindUserByEmail = (email) => users.findByEmail({ companyId: undefined, email });

/**
 * O e-mail que a pessoa recebe quando pede para redefinir a senha vira uma notificacao do
 * `notification-module`, e nao mais o texto fixo do `user-module` — e isso que permite editar a
 * copy pelo painel, com preview, sem deploy.
 *
 * Tres decisoes aqui nao sao obvias, e as tres protegem o acesso a conta:
 *
 * 1. **O evento nao traz `userId`, so `email`.** Isso e de proposito no `user-module`: o
 *    `RequestPasswordResetUseCase` responde igual exista ou nao a conta, defesa contra enumeracao.
 *    Como `sendNotification` e por usuario (preferencia, supressao, historico), o `userId` e
 *    resolvido aqui, por e-mail. E seguro: este hook so dispara quando o usuario existe de verdade.
 *
 * 2. **Nunca lanca.** Uma excecao subindo daqui viraria diferenca observavel entre e-mail que
 *    existe e e-mail que nao existe — exatamente a enumeracao que o modulo evita. Falha vira log.
 *
 * 3. **Supressao nao pode calar recuperacao de conta.** Ver `sendOrFallback` abaixo.
 */
export function createPasswordResetNotifier(params: {
  readonly module: NotificationModule;
  readonly companyId: string;
  readonly emailDriver?: EmailDriverPort;
  readonly logger: UserLoggerPort;
  /** Injetavel so para teste: em producao a busca e sempre a do `user-module`. */
  readonly findUser?: FindUserByEmail;
}): (event: PasswordResetRequestedEvent) => Promise<void> {
  const findUser = params.findUser ?? findUserByEmail;

  return async function notifyPasswordResetRequested(event: PasswordResetRequestedEvent): Promise<void> {
    let reason: string | undefined;

    try {
      const user = await findUser(event.email);
      if (!user) {
        /*
          Sair calado aqui e o unico desfecho que nao deixa rastro nenhum: a rota responde 202, o
          e-mail nunca sai, e nem banco nem log registram o motivo.

          Sem PII no log — quem foi procurado se descobre pelo `resetUrl` da trilha, nao pelo
          endereco (`security.md` §1).
        */
        params.logger.error('Redefinicao de senha pedida para e-mail sem conta correspondente');
        return;
      }

      const result = await params.module.useCases.sendNotification.execute({
        companyId: params.companyId,
        recipientUserId: user.id,
        category: NOTIFICATION_CATEGORY_AUTH,
        templateKey: NOTIFICATION_TEMPLATE_PASSWORD_RESET,
        // Sem `dedupeKey`: cada pedido gera um token novo, e o segundo pedido costuma ser
        // justamente alguem que nao recebeu o primeiro. Deduplicar aqui deixaria a pessoa sem
        // saida.
        payload: { resetUrl: event.resetUrl },
        channels: [NOTIFICATION_CHANNEL.EMAIL],
      });

      reason = resolveFallbackReason(result.deliveries);
    } catch (error) {
      /**
       * Nem toda recusa do modulo chega como entrega pulada: sem template ativo ele LANCA
       * `TemplateNotFoundError`, antes de qualquer despacho. Tratar excecao so como log fazia a
       * redefinicao terminar em silencio — a mesma falha muda que este arquivo existe para
       * impedir, e que so apareceu testando com o template desativado pelo painel.
       */
      reason = `excecao:${String(error)}`;
    }

    if (reason) await sendDirectly({ ...params, event, reason });
  };
}

export type DeliveryOutcome = {
  readonly channel: string;
  readonly status: string;
  readonly errorCode?: string;
};

/**
 * A decisao isolada do I/O, para poder ser testada sem banco nem driver.
 *
 * Devolve o motivo quando o modulo NAO entregou — entrega pulada, ou nenhuma entrega de e-mail
 * criada (canal ausente, destinatario sem endereco). `undefined` significa que o caminho normal
 * seguiu, e nao ha nada a fazer.
 */
export function resolveFallbackReason(deliveries: readonly DeliveryOutcome[]): string | undefined {
  const email = deliveries.find((delivery) => delivery.channel === NOTIFICATION_CHANNEL.EMAIL);
  if (!email) return 'sem_entrega_de_email';
  if (email.status !== 'skipped') return undefined;
  return email.errorCode ?? 'entrega_pulada';
}

/**
 * A rede de seguranca da recuperacao de conta.
 *
 * O `notification-module` pula um canal — em silencio, por desenho — quando o endereco esta
 * suprimido por bounce anterior, quando a politica de canal da empresa desligou o canal, ou quando
 * o template ainda nao foi semeado. Para aviso de pedido isso e correto. Para redefinicao de senha
 * e uma pessoa trancada fora da conta sem receber nada explicando.
 *
 * Entao o caminho normal continua sendo o modulo (template editavel, entrega auditavel), e este
 * fallback so existe para o caso em que o modulo se recusou a entregar. A decisao de pular e
 * sincrona (acontece antes de enfileirar), entao ela ja chega em `result.deliveries`.
 *
 * O bypass mora no HOST, e nao como uma flag `bypassSuppression` no pacote, de proposito: uma flag
 * assim seria uma porta aberta a qualquer chamador, e supressao existe para proteger a reputacao
 * do dominio de envio. Aqui ela e furada num unico lugar, para um unico fluxo, com log.
 */
async function sendDirectly(params: {
  readonly event: PasswordResetRequestedEvent;
  readonly reason: string;
  readonly emailDriver?: EmailDriverPort;
  readonly logger: UserLoggerPort;
}): Promise<void> {
  if (!params.emailDriver) {
    params.logger.error('Redefinicao de senha nao entregue e sem driver de e-mail para o fallback', {
      reason: params.reason,
    });
    return;
  }

  params.logger.warn('Redefinicao de senha caiu no envio direto, fora do modulo de notificacao', {
    reason: params.reason,
  });

  await params.emailDriver.send({
    to: params.event.email,
    subject: 'Redefinicao de senha',
    text: `Para redefinir sua senha, acesse: ${params.event.resetUrl}`,
    html: `<p>Para redefinir sua senha, <a href="${params.event.resetUrl}">clique aqui</a>.</p>`,
  });
}
