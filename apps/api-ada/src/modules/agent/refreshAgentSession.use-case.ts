/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { ACCESS_TOKEN_TTL_SECONDS, signAccessToken } from '@/modules/agent/accessToken';
import { AgentNotAuthenticatedError } from '@/modules/agent/agent.error';
import type {
  AgentSessionResult,
  RefreshAgentSessionDependencies,
} from '@/modules/agent/types/agent.types';

export class RefreshAgentSessionUseCase {
  constructor(private readonly dependencies: RefreshAgentSessionDependencies) {}

  async execute(refreshToken: string): Promise<AgentSessionResult> {
    const { agents, refreshTokens } = this.dependencies;
    const rotated = await refreshTokens.rotate(refreshToken);

    if (!rotated) throw new AgentNotAuthenticatedError();

    const agent = await agents.findById(rotated.agentId);

    // Conta desativada entre um refresh e outro: o token rotacionado ja foi gasto acima, entao
    // derrubar o novo aqui encerra a sessao em vez de deixar um refresh vivo sem dono valido.
    if (!agent) {
      await refreshTokens.revoke(rotated.token);
      throw new AgentNotAuthenticatedError();
    }

    return {
      accessToken: await signAccessToken({ agentId: agent.id, role: agent.role }),
      expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
      refreshToken: rotated.token,
      refreshExpiresInSeconds: rotated.expiresInSeconds,
      agent,
    };
  }
}
