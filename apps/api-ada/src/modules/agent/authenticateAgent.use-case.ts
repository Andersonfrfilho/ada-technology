/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { randomBytes } from 'node:crypto';

import { ACCESS_TOKEN_TTL_SECONDS, signAccessToken } from '@/modules/agent/accessToken';
import { InvalidCredentialsError } from '@/modules/agent/agent.error';
import type {
  AgentCredentials,
  AgentSessionResult,
  AuthenticateAgentDependencies,
  AuthenticateAgentParams,
} from '@/modules/agent/types/agent.types';
import { ACTOR_TYPE, AUDIT_ACTION, AUDIT_TARGET } from '@/modules/audit/audit.constant';

/**
 * Hash de um valor aleatorio, conferido quando o e-mail nao existe.
 *
 * Sem ele a rota responderia na hora para e-mail desconhecido e depois de um argon2 inteiro para
 * e-mail existente — diferenca de tempo que enumera a lista de contas sem precisar acertar
 * nenhuma senha.
 */
const decoyPasswordHash = Bun.password.hash(randomBytes(32).toString('hex'));

export class AuthenticateAgentUseCase {
  constructor(private readonly dependencies: AuthenticateAgentDependencies) {}

  async execute({ email, password, ipAddress }: AuthenticateAgentParams): Promise<AgentSessionResult> {
    const { agents, refreshTokens } = this.dependencies;
    const found = await agents.findByEmail(email);
    const isPasswordValid = await Bun.password.verify(
      password,
      found?.passwordHash ?? (await decoyPasswordHash),
    );

    if (!found || !found.isActive || !isPasswordValid) {
      await this.recordFailure({ email, ipAddress, agentId: found?.id });
      throw new InvalidCredentialsError();
    }

    const [accessToken, refresh] = await Promise.all([
      signAccessToken({ agentId: found.id, role: found.role }),
      refreshTokens.issue(found.id),
      agents.touchLastSeen(found.id),
    ]);

    await this.dependencies.recordAudit.execute({
      actorType: ACTOR_TYPE.AGENT,
      actorId: found.id,
      action: AUDIT_ACTION.AGENT_SIGNED_IN,
      targetType: AUDIT_TARGET.AGENT,
      targetId: found.id,
      ipAddress,
    });

    return toSessionResult({ agent: found, accessToken, refreshToken: refresh.token, refreshExpiresInSeconds: refresh.expiresInSeconds });
  }

  /**
   * Tentativa recusada tambem vira trilha: sem ela, uma sequencia de senhas erradas contra a mesma
   * conta nao deixa rastro nenhum. Guarda o id quando a conta existe, e nunca o e-mail digitado.
   */
  private async recordFailure(params: {
    readonly email: string;
    readonly ipAddress: string;
    readonly agentId: string | undefined;
  }): Promise<void> {
    await this.dependencies.recordAudit.execute({
      actorType: ACTOR_TYPE.AGENT,
      ...(params.agentId ? { actorId: params.agentId, targetId: params.agentId } : {}),
      action: AUDIT_ACTION.AGENT_SIGN_IN_FAILED,
      targetType: AUDIT_TARGET.AGENT,
      ipAddress: params.ipAddress,
    });
  }
}

type ToSessionResultParams = {
  readonly agent: AgentCredentials;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly refreshExpiresInSeconds: number;
};

function toSessionResult({
  agent,
  accessToken,
  refreshToken,
  refreshExpiresInSeconds,
}: ToSessionResultParams): AgentSessionResult {
  return {
    accessToken,
    expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
    refreshToken,
    refreshExpiresInSeconds,
    agent: { id: agent.id, email: agent.email, name: agent.name, role: agent.role },
  };
}
