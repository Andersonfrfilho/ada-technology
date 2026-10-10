/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { randomBytes } from 'node:crypto';

import type {
  VerifyAgentPasswordDependencies,
  VerifyAgentPasswordParams,
  VerifyAgentPasswordResult,
} from '@/modules/agent/types/agent.types';
import {
  INFRA_PASSWORD_FAILURE_LIMIT,
  INFRA_PASSWORD_FAILURE_WINDOW_SECONDS,
  INFRA_PASSWORD_LOCK_SECONDS,
} from '@/modules/infra/infraPasswordLock.constant';
import { AGENT_ROLE } from '@/shared/constants/domain.constant';

// Conferido quando o agente não é elegível, para a resposta não revelar o motivo pelo tempo.
const decoyPasswordHash = Bun.password.hash(randomBytes(32).toString('hex'));

export class VerifyAgentPasswordUseCase {
  constructor(private readonly dependencies: VerifyAgentPasswordDependencies) {}

  async execute({ agentId, password }: VerifyAgentPasswordParams): Promise<VerifyAgentPasswordResult> {
    const { agents, failureCounter } = this.dependencies;

    const lockRemaining = await failureCounter.getLockRemainingSeconds(agentId);
    if (lockRemaining !== undefined) {
      return { outcome: 'locked', retryAfterSeconds: lockRemaining, isNewLock: false };
    }

    const credentials = await agents.findCredentialsById(agentId);
    const isPasswordValid = await Bun.password.verify(password, credentials?.passwordHash ?? (await decoyPasswordHash));
    const isEligible = credentials?.isActive === true && credentials.role === AGENT_ROLE.ADMIN;

    if (isEligible && isPasswordValid) {
      await failureCounter.reset(agentId);
      return { outcome: 'confirmed' };
    }

    return this.registerFailure(agentId);
  }

  private async registerFailure(agentId: string): Promise<VerifyAgentPasswordResult> {
    const { failureCounter, refreshTokens } = this.dependencies;
    const failures = await failureCounter.recordFailure({
      agentId,
      windowSeconds: INFRA_PASSWORD_FAILURE_WINDOW_SECONDS,
    });
    if (failures < INFRA_PASSWORD_FAILURE_LIMIT) return { outcome: 'invalid' };

    await refreshTokens.revokeAllFor(agentId);
    await failureCounter.lock({ agentId, seconds: INFRA_PASSWORD_LOCK_SECONDS });

    return { outcome: 'locked', retryAfterSeconds: INFRA_PASSWORD_LOCK_SECONDS, isNewLock: true };
  }
}
