/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from the Ada Technology.
 */

import { beforeAll, describe, expect, it } from 'bun:test';

import { VerifyAgentPasswordUseCase } from '@/modules/agent/verifyAgentPassword.use-case';
import type { AgentCredentials } from '@/modules/agent/types/agent.types';
import { FakeFailureCounter } from '@/modules/infra/infraFakes/FakeFailureCounter';
import {
  INFRA_PASSWORD_FAILURE_WINDOW_SECONDS,
  INFRA_PASSWORD_LOCK_SECONDS,
} from '@/modules/infra/infraPasswordLock.constant';

const AGENT_ID = 'agent-1';
const RIGHT_PASSWORD = 'senha-de-teste-correta-1';
const WRONG_PASSWORD = 'senha-de-teste-errada-9';

let passwordHash = '';

beforeAll(async () => {
  passwordHash = await Bun.password.hash(RIGHT_PASSWORD);
});

function buildCredentials(overrides: Partial<AgentCredentials> = {}): AgentCredentials {
  return {
    id: AGENT_ID,
    email: 'admin@example.test',
    name: 'Admin',
    role: 'admin',
    passwordHash,
    isActive: true,
    ...overrides,
  };
}

function buildHarness(credentials: AgentCredentials | undefined) {
  const failureCounter = new FakeFailureCounter();
  const revokedAgentIds: string[] = [];
  let lookups = 0;
  const useCase = new VerifyAgentPasswordUseCase({
    agents: {
      findCredentialsById: async () => {
        lookups += 1;
        return credentials;
      },
    },
    refreshTokens: {
      revokeAllFor: async (agentId) => {
        revokedAgentIds.push(agentId);
        return 2;
      },
    },
    failureCounter,
  });

  return { useCase, failureCounter, revokedAgentIds, lookups: () => lookups };
}

async function failTimes(useCase: VerifyAgentPasswordUseCase, times: number): Promise<void> {
  for (let attempt = 0; attempt < times; attempt += 1) {
    await useCase.execute({ agentId: AGENT_ID, password: WRONG_PASSWORD });
  }
}

describe('VerifyAgentPasswordUseCase', () => {
  it('confirma a senha certa de admin ativo e zera o contador', async () => {
    const { useCase, failureCounter } = buildHarness(buildCredentials());
    await failTimes(useCase, 4);
    expect(failureCounter.failures.get(AGENT_ID)).toBe(4);

    const result = await useCase.execute({ agentId: AGENT_ID, password: RIGHT_PASSWORD });

    expect(result).toEqual({ outcome: 'confirmed' });
    expect(failureCounter.failures.has(AGENT_ID)).toBe(false);
  });

  it('senha errada devolve invalid e usa a janela de 15 min', async () => {
    const { useCase, failureCounter } = buildHarness(buildCredentials());

    const result = await useCase.execute({ agentId: AGENT_ID, password: WRONG_PASSWORD });

    expect(result).toEqual({ outcome: 'invalid' });
    expect(failureCounter.windowSecondsUsed).toEqual([INFRA_PASSWORD_FAILURE_WINDOW_SECONDS]);
  });

  it('papel rebaixado no banco: senha certa de agente comum e invalid', async () => {
    const { useCase, failureCounter } = buildHarness(buildCredentials({ role: 'agent' }));

    const result = await useCase.execute({ agentId: AGENT_ID, password: RIGHT_PASSWORD });

    expect(result).toEqual({ outcome: 'invalid' });
    expect(failureCounter.failures.get(AGENT_ID)).toBe(1);
  });

  it('agente inativo e invalid mesmo com a senha certa', async () => {
    const { useCase } = buildHarness(buildCredentials({ isActive: false }));

    expect(await useCase.execute({ agentId: AGENT_ID, password: RIGHT_PASSWORD })).toEqual({ outcome: 'invalid' });
  });

  it('agente inexistente conta como falha e devolve o mesmo invalid', async () => {
    const { useCase, failureCounter } = buildHarness(undefined);

    const result = await useCase.execute({ agentId: AGENT_ID, password: WRONG_PASSWORD });

    expect(result).toEqual({ outcome: 'invalid' });
    expect(failureCounter.failures.get(AGENT_ID)).toBe(1);
  });

  it('lock ativo recusa ate com a senha certa, sem consultar o banco', async () => {
    const { useCase, failureCounter, lookups } = buildHarness(buildCredentials());
    failureCounter.locks.set(AGENT_ID, 321);

    const result = await useCase.execute({ agentId: AGENT_ID, password: RIGHT_PASSWORD });

    expect(result).toEqual({ outcome: 'locked', retryAfterSeconds: 321, isNewLock: false });
    expect(lookups()).toBe(0);
    expect(failureCounter.failures.size).toBe(0);
  });

  it('a 5a falha revoga as sessoes, bloqueia por 15 min e devolve isNewLock', async () => {
    const { useCase, failureCounter, revokedAgentIds } = buildHarness(buildCredentials());
    await failTimes(useCase, 4);
    expect(revokedAgentIds).toEqual([]);

    const result = await useCase.execute({ agentId: AGENT_ID, password: WRONG_PASSWORD });

    expect(result).toEqual({
      outcome: 'locked',
      retryAfterSeconds: INFRA_PASSWORD_LOCK_SECONDS,
      isNewLock: true,
    });
    expect(revokedAgentIds).toEqual([AGENT_ID]);
    expect(failureCounter.locks.get(AGENT_ID)).toBe(INFRA_PASSWORD_LOCK_SECONDS);
  });

  it('a 6a tentativa devolve locked sem novo bloqueio e com retryAfterSeconds do TTL do lock', async () => {
    const { useCase, failureCounter, revokedAgentIds } = buildHarness(buildCredentials());
    await failTimes(useCase, 5);
    failureCounter.locks.set(AGENT_ID, 640);

    const result = await useCase.execute({ agentId: AGENT_ID, password: WRONG_PASSWORD });

    expect(result).toEqual({ outcome: 'locked', retryAfterSeconds: 640, isNewLock: false });
    expect(revokedAgentIds).toEqual([AGENT_ID]);
  });

  it('a senha nao aparece no resultado', async () => {
    const { useCase } = buildHarness(buildCredentials());

    const result = await useCase.execute({ agentId: AGENT_ID, password: WRONG_PASSWORD });

    expect(JSON.stringify(result)).not.toContain(WRONG_PASSWORD);
  });
});
