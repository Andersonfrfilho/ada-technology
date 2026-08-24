/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, test } from 'bun:test';

import { resolveFallbackReason } from '@/modules/notification/passwordResetNotifier';

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
