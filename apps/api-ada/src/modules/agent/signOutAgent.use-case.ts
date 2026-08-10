/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type {
  SignOutAgentDependencies,
  SignOutAgentParams,
} from '@/modules/agent/types/agent.types';
import { ACTOR_TYPE, AUDIT_ACTION, AUDIT_TARGET } from '@/modules/audit/audit.constant';

export class SignOutAgentUseCase {
  constructor(private readonly dependencies: SignOutAgentDependencies) {}

  async execute({ refreshToken, agentId, ipAddress }: SignOutAgentParams): Promise<void> {
    if (refreshToken) await this.dependencies.refreshTokens.revoke(refreshToken);

    await this.dependencies.recordAudit.execute({
      actorType: ACTOR_TYPE.AGENT,
      actorId: agentId,
      action: AUDIT_ACTION.AGENT_SIGNED_OUT,
      targetType: AUDIT_TARGET.AGENT,
      targetId: agentId,
      ipAddress,
    });
  }
}
