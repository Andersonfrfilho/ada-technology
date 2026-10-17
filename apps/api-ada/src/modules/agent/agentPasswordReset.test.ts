/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { createHash } from 'node:crypto';

import { describe, expect, it, mock } from 'bun:test';

const store = new Map<string, string>();

mock.module('@/infra/cache/redisClient', () => ({
  redis: {
    set: async (key: string, value: string) => void store.set(key, value),
    getdel: async (key: string) => {
      const value = store.get(key);
      store.delete(key);
      return value ?? null;
    },
  },
}));

const { consumeAgentResetToken, issueAgentResetToken, resetKeyOf } = await import(
  '@/modules/agent/agentPasswordReset'
);

describe('token de redefinicao do painel', () => {
  it('guarda o digest, e nunca o token', async () => {
    const { token } = await issueAgentResetToken('agente-1');

    const digest = createHash('sha256').update(token).digest('hex');
    expect(resetKeyOf(token)).toContain(digest);

    // Quem le um dump do Redis nao pode redefinir a senha de ninguem.
    expect([...store.keys()].some((key) => key.includes(token))).toBe(false);
  });

  it('vale uma vez so — o segundo uso nao encontra nada', async () => {
    const { token } = await issueAgentResetToken('agente-2');

    expect(await consumeAgentResetToken(token)).toBe('agente-2');
    expect(await consumeAgentResetToken(token)).toBeUndefined();
  });

  it('token com forma errada nem chega ao Redis', async () => {
    let consultou = false;
    const antes = store.size;

    expect(await consumeAgentResetToken('curto')).toBeUndefined();
    expect(await consumeAgentResetToken('tem espaco e simbolo $$$')).toBeUndefined();
    expect(consultou).toBe(false);
    expect(store.size).toBe(antes);
  });

  it('cada emissao gera um token diferente', async () => {
    const primeiro = await issueAgentResetToken('agente-3');
    const segundo = await issueAgentResetToken('agente-3');

    expect(primeiro.token).not.toBe(segundo.token);
    // Os dois valem: pedir de novo costuma ser quem nao recebeu o primeiro e-mail.
    expect(await consumeAgentResetToken(primeiro.token)).toBe('agente-3');
    expect(await consumeAgentResetToken(segundo.token)).toBe('agente-3');
  });
});
