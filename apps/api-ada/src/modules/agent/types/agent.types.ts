/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { UserProfile, UserSession } from '@ada/user-sdk';

import type { RecordAuditLogParams } from '@/modules/audit/types/audit.types';
import type { AgentRole } from '@/shared/constants/domain.constant';

/**
 * O que o token carrega e o que o guard entrega ao controller.
 *
 * Nome e e-mail ficam de fora de proposito: o token viaja em header, aparece em proxy e em log de
 * borda, e nada nele deve ser dado pessoal. Quem precisa do cadastro chama `GET /v1/auth/me`.
 */
export type AuthenticatedAgent = {
  readonly agentId: string;
  readonly role: AgentRole;
};

/** Alias de `UserProfile` do `@ada/user-sdk` — mesmo shape, nome do dominio local. */
export type AgentProfile = UserProfile;

export type AgentCredentials = AgentProfile & {
  readonly passwordHash: string;
  readonly isActive: boolean;
};

export type CreateAgentRecord = {
  readonly email: string;
  readonly name: string;
  readonly role: AgentRole;
  readonly passwordHash: string;
};

export type AgentRepositoryInterface = {
  findByEmail(email: string): Promise<AgentCredentials | undefined>;
  findById(agentId: string): Promise<AgentProfile | undefined>;
  listActive(): Promise<readonly AgentProfile[]>;
  touchLastSeen(agentId: string): Promise<void>;
  create(record: CreateAgentRecord): Promise<AgentProfile>;
};

export type CreateAgentParams = {
  readonly email: string;
  readonly name: string;
  readonly password: string;
  readonly role: AgentRole;
};

export type CreateAgentDependencies = {
  readonly agents: AgentRepositoryInterface;
};

export type IssuedRefreshToken = {
  readonly token: string;
  readonly expiresInSeconds: number;
};

export type RotatedRefreshToken = IssuedRefreshToken & {
  readonly agentId: string;
};

/**
 * Guarda os refresh tokens vivos.
 *
 * `rotate` consome o token apresentado e devolve outro: e o que garante que um refresh roubado
 * so serve uma vez, e que o uso do antigo depois da rotacao nao autentica ninguem.
 */
export type RefreshTokenStoreInterface = {
  issue(agentId: string): Promise<IssuedRefreshToken>;
  rotate(token: string): Promise<RotatedRefreshToken | undefined>;
  revoke(token: string): Promise<void>;
};

export type AuthenticateAgentParams = {
  readonly email: string;
  readonly password: string;
  readonly ipAddress: string;
};

/**
 * `UserSession` do SDK e o shape que o JSON de `/v1/auth/*` expoe; refresh token e o TTL dele
 * nunca vao no corpo (viajam so no cookie `HttpOnly`, ver `sessionResponse` no controller), entao
 * ficam como campos extras aqui, internos ao backend, em vez de entrar no tipo compartilhado.
 */
export type AgentSessionResult = UserSession & {
  readonly refreshToken: string;
  readonly refreshExpiresInSeconds: number;
};

export type AuthenticateAgentDependencies = {
  readonly agents: AgentRepositoryInterface;
  readonly refreshTokens: RefreshTokenStoreInterface;
  readonly recordAudit: RecordAuditLogInterface;
};

export type SignOutAgentParams = {
  /** Ausente quando o navegador ja perdeu o cookie; o logout segue valendo como trilha. */
  readonly refreshToken: string | undefined;
  readonly agentId: string;
  readonly ipAddress: string;
};

export type SignOutAgentDependencies = {
  readonly refreshTokens: RefreshTokenStoreInterface;
  readonly recordAudit: RecordAuditLogInterface;
};

export type RefreshAgentSessionDependencies = {
  readonly agents: AgentRepositoryInterface;
  readonly refreshTokens: RefreshTokenStoreInterface;
};

export type RecordAuditLogInterface = {
  execute(params: RecordAuditLogParams): Promise<void>;
};
