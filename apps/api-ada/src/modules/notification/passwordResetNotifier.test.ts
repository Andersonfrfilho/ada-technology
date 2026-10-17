/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import type { PasswordResetRequestedEvent } from '@adatechnology/user-contracts';

import { createPasswordResetNotifier } from '@/modules/notification/passwordResetNotifier';

const EVENT = {
  type: 'password_reset.requested',
  email: 'maria@exemplo.com.br',
  resetUrl: 'https://painel.ada.test/senha/nova?token=abc',
  occurredAt: new Date('2026-08-27T02:00:00.000Z'),
} as unknown as PasswordResetRequestedEvent;

type LogEntry = { readonly message: string; readonly meta?: Record<string, unknown> };

function buildNotifier(params: {
  readonly findUser: (email: string) => Promise<{ readonly id: string } | undefined>;
  readonly sendNotification?: (input: unknown) => Promise<unknown>;
}) {
  const errors: LogEntry[] = [];
  const warns: LogEntry[] = [];

  const notifier = createPasswordResetNotifier({
    module: {
      useCases: {
        sendNotification: {
          execute: params.sendNotification ?? (async () => ({ deliveries: [{ channel: 'email', status: 'queued' }] })),
        },
      },
    } as never,
    companyId: '22222222-2222-4222-8222-222222222222',
    logger: {
      error: (message: string, meta?: Record<string, unknown>) => errors.push({ message, ...(meta ? { meta } : {}) }),
      warn: (message: string, meta?: Record<string, unknown>) => warns.push({ message, ...(meta ? { meta } : {}) }),
      info: () => undefined,
      debug: () => undefined,
    } as never,
    findUser: params.findUser,
  });

  return { notifier, errors, warns };
}

describe('createPasswordResetNotifier', () => {
  /**
   * O desfecho que nao deixava rastro nenhum: sem conta correspondente, a rota respondia 202, o
   * e-mail nunca saia, e nem banco nem log registravam o motivo.
   */
  it('loga quando nao ha conta para o e-mail, em vez de sair calado', async () => {
    const { notifier, errors } = buildNotifier({ findUser: async () => undefined });

    await notifier(EVENT);

    expect(errors).toHaveLength(1);
  });

  /** O log do desfecho acima nao pode carregar o endereco (`security.md` §1). */
  it('nao coloca o e-mail no log', async () => {
    const { notifier, errors } = buildNotifier({ findUser: async () => undefined });

    await notifier(EVENT);

    expect(JSON.stringify(errors)).not.toContain('maria@exemplo.com.br');
  });

  it('nao loga nada quando o envio segue o caminho normal', async () => {
    const { notifier, errors, warns } = buildNotifier({ findUser: async () => ({ id: 'agente-1' }) });

    await notifier(EVENT);

    expect([...errors, ...warns]).toHaveLength(0);
  });
});
