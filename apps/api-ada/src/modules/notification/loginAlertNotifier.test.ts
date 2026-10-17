/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import type { LoginSucceededEvent } from '@adatechnology/user-contracts';

import { createLoginAlertNotifier } from '@/modules/notification/loginAlertNotifier';

const EVENT = {
  type: 'login.succeeded',
  userId: '11111111-1111-4111-8111-111111111111',
  email: 'maria@exemplo.com.br',
  ipAddress: '187.45.10.22',
  occurredAt: new Date('2026-08-25T12:14:00.000Z'),
} as unknown as LoginSucceededEvent;

function buildNotifier(sendNotification: (params: unknown) => Promise<unknown>) {
  const avisos: { message: string; meta?: Record<string, unknown> }[] = [];

  const notifier = createLoginAlertNotifier({
    module: { useCases: { sendNotification: { execute: sendNotification } } } as never,
    companyId: '22222222-2222-4222-8222-222222222222',
    passwordChangeUrl: 'https://painel.ada.test/perfil/senha',
    logger: {
      warn: (message: string, meta?: Record<string, unknown>) => avisos.push({ message, ...(meta ? { meta } : {}) }),
      error: () => undefined,
      info: () => undefined,
      debug: () => undefined,
    } as never,
    now: () => new Date('2026-08-25T12:14:00.000Z'),
  });

  return { notifier, avisos };
}

describe('createLoginAlertNotifier', () => {
  it('dispara com a categoria, o template e o payload do aviso', async () => {
    let recebido: Record<string, unknown> | undefined;
    const { notifier } = buildNotifier(async (params) => {
      recebido = params as Record<string, unknown>;
      return { deliveries: [] };
    });

    await notifier(EVENT);

    expect(recebido?.category).toBe('auth.login_alert');
    expect(recebido?.templateKey).toBe('auth.login_alert');
    expect(recebido?.payload).toEqual({
      signedInAt: expect.stringContaining('25/08/2026'),
      ipAddress: '187.45.10.22',
      passwordChangeUrl: 'https://painel.ada.test/perfil/senha',
    });
  });

  /**
   * Sem `channels`: o fan-out resolve pelas preferencias, e o dia em que um driver de push ou
   * WhatsApp entrar no modulo o aviso passa a sair por ele sem mudar este arquivo.
   */
  it('nao força canal, para o aviso seguir a preferencia do destinatario', async () => {
    let recebido: Record<string, unknown> | undefined;
    const { notifier } = buildNotifier(async (params) => {
      recebido = params as Record<string, unknown>;
      return { deliveries: [] };
    });

    await notifier(EVENT);

    expect(recebido).not.toHaveProperty('channels');
  });

  /** Trocar um incomodo por uma porta trancada seria pior que nao avisar. */
  it('falha do aviso nao derruba o login', async () => {
    const { notifier, avisos } = buildNotifier(async () => {
      throw new Error('template inativo');
    });

    await notifier(EVENT);

    expect(avisos[0]?.message).toBe('Aviso de acesso nao enviado');
  });

  /** O IP e dado pessoal e o e-mail tambem — no log fica so o id opaco. */
  it('o log da falha nao carrega e-mail nem IP', async () => {
    const { notifier, avisos } = buildNotifier(async () => {
      throw new Error('falhou');
    });

    await notifier(EVENT);
    const registrado = JSON.stringify(avisos[0]);

    expect(registrado).not.toContain('maria@exemplo.com.br');
    expect(registrado).not.toContain('187.45.10.22');
    expect(registrado).toContain('11111111-1111-4111-8111-111111111111');
  });

  it('a data sai no fuso do produto, e nao em UTC', async () => {
    let recebido: Record<string, unknown> | undefined;
    const { notifier } = buildNotifier(async (params) => {
      recebido = params as Record<string, unknown>;
      return { deliveries: [] };
    });

    await notifier(EVENT);

    // 12:14 UTC vira 09:14 em Sao Paulo.
    expect((recebido?.payload as Record<string, string>)?.signedInAt).toContain('09:14');
  });
});
