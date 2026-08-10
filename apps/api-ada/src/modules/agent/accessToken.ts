/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { jwtVerify, SignJWT } from 'jose';

import { environment } from '@/infra/config/environment';
import {
  ACCESS_TOKEN_AUDIENCE,
  ACCESS_TOKEN_ISSUER,
} from '@/modules/agent/agent.constant';
import type { AuthenticatedAgent } from '@/modules/agent/types/agent.types';
import { AGENT_ROLE, type AgentRole } from '@/shared/constants/domain.constant';

const SECONDS_PER_MINUTE = 60;
const ALGORITHM = 'HS256';
const secretKey = new TextEncoder().encode(environment.PANEL_JWT_SECRET);

export const ACCESS_TOKEN_TTL_SECONDS =
  environment.PANEL_ACCESS_TOKEN_TTL_MINUTES * SECONDS_PER_MINUTE;

export async function signAccessToken(agent: AuthenticatedAgent): Promise<string> {
  return new SignJWT({ role: agent.role })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(agent.agentId)
    .setIssuer(ACCESS_TOKEN_ISSUER)
    .setAudience(ACCESS_TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secretKey);
}

/**
 * Devolve `undefined` para qualquer token que nao sirva — expirado, adulterado, emitido para outra
 * plateia. O motivo nao volta ao cliente de proposito: dizer "expirado" e "assinatura invalida"
 * separadamente ensina o atacante o que ajustar na proxima tentativa.
 */
export async function verifyAccessToken(token: string): Promise<AuthenticatedAgent | undefined> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: [ALGORITHM],
      issuer: ACCESS_TOKEN_ISSUER,
      audience: ACCESS_TOKEN_AUDIENCE,
    });

    const role = toAgentRole(payload.role);
    if (!payload.sub || !role) return undefined;

    return { agentId: payload.sub, role };
  } catch {
    return undefined;
  }
}

function toAgentRole(value: unknown): AgentRole | undefined {
  const roles: readonly string[] = Object.values(AGENT_ROLE);

  return typeof value === 'string' && roles.includes(value) ? (value as AgentRole) : undefined;
}
