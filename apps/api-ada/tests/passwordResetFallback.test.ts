/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, test } from 'bun:test';

import {
  createPasswordResetNotifier,
  resolveFallbackReason,
} from '@/modules/notification/passwordResetNotifier';

/**
 * Esta funcao decide se alguem consegue voltar para a propria conta.
 *
 * O modo de falha que ela existe para impedir e mudo: o `notification-module` pula o canal em
 * silencio (endereco suprimido por bounce, politica de canal desligada, template ainda nao
 * semeado) e responde com sucesso. Sem esta checagem, o pedido de redefinicao termina "com
 * sucesso" e nenhum e-mail sai.
 */
describe('resolveFallbackReason', () => {
  test('entrega enfileirada segue o caminho normal, sem fallback', () => {
    expect(resolveFallbackReason([{ channel: 'email', status: 'queued' }])).toBeUndefined();
  });

  test('endereco suprimido por bounce anterior nao pode calar a recuperacao de conta', () => {
    expect(resolveFallbackReason([{ channel: 'email', status: 'skipped', errorCode: 'suppressed' }])).toBe(
      'suppressed',
    );
  });

  test('politica de canal da empresa tambem nao derruba o reset', () => {
    expect(
      resolveFallbackReason([{ channel: 'email', status: 'skipped', errorCode: 'disabled_by_policy' }]),
    ).toBe('disabled_by_policy');
  });

  test('template ainda nao semeado cai no envio direto em vez de nao enviar nada', () => {
    expect(
      resolveFallbackReason([{ channel: 'email', status: 'skipped', errorCode: 'template_not_found' }]),
    ).toBe('template_not_found');
  });

  test('nenhuma entrega de e-mail criada conta como nao entregue', () => {
    expect(resolveFallbackReason([])).toBe('sem_entrega_de_email');
  });

  test('entrega de outro canal nao vale como entrega de e-mail', () => {
    expect(resolveFallbackReason([{ channel: 'inbox', status: 'sent' }])).toBe('sem_entrega_de_email');
  });

  test('pulo sem codigo ainda dispara o fallback, com motivo generico', () => {
    expect(resolveFallbackReason([{ channel: 'email', status: 'skipped' }])).toBe('entrega_pulada');
  });
});

/**
 * O buraco que os testes acima NAO pegavam, e que so apareceu testando com o template desativado
 * pelo painel: `sendNotification` nao devolve entrega pulada quando nao ha template ativo — ele
 * LANCA `TemplateNotFoundError`, antes de qualquer despacho. Enquanto o `catch` so logava, o
 * pedido de redefinicao terminava em silencio e ninguem recebia nada.
 *
 * `resolveFallbackReason` continua sendo a decisao do caminho feliz; o contrato travado aqui e o
 * do notificador: excecao TAMBEM cai no envio direto.
 */
describe('excecao do modulo', () => {
  test('nao entregar por excecao vale tanto quanto entregar pulado', async () => {
    const enviados: string[] = [];
    const emailDriver = {
      async send({ to }: { to: string }) {
        enviados.push(to);
        return { outcome: 'sent' as const };
      },
    };

    const notifier = createPasswordResetNotifier({
      module: {
        useCases: {
          sendNotification: {
            execute: async () => {
              throw new Error('Template não encontrado para a chave informada neste canal e locale.');
            },
          },
        },
      } as never,
      companyId: '00000000-0000-4000-8000-000000000000',
      // Sem isto o teste passaria pelo motivo errado: a busca real bate no banco, que nao existe
      // no ambiente de teste, e a excecao dela cairia no mesmo `catch` — o teste ficaria verde
      // mesmo com o tratamento do template quebrado.
      findUser: async () => ({ id: '11111111-1111-4111-8111-111111111111' }),
      emailDriver: emailDriver as never,
      logger: { debug() {}, info() {}, warn() {}, error() {} },
    });

    await notifier({
      type: 'user.password_reset_requested',
      companyId: '00000000-0000-4000-8000-000000000000',
      occurredAt: new Date(),
      email: 'quem-perdeu-a-senha@ada.local',
      resetUrl: 'https://painel.local/reset?token=abc',
    } as never);

    expect(enviados).toEqual(['quem-perdeu-a-senha@ada.local']);
  });
});
