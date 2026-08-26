/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { AGENTS_PATH } from '@/modules/agents/agents.constant';
import { HTTP_METHOD } from '@/modules/shared/http/http.constant';
import { panelRequest } from '@/modules/shared/http/panelHttpClient';

export type AgentSummary = {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  /** So chega para `admin` — a agenda nao precisa do e-mail de ninguem. */
  readonly email?: string;
  readonly isActive?: boolean;
  /** URL assinada de vida curta; ausente quando nao ha foto ou nao ha bucket. */
  readonly avatarUrl?: string;
};

export type CreateAgentInput = {
  readonly email: string;
  readonly name: string;
  readonly password: string;
  readonly role: string;
};

export async function listAgents(): Promise<readonly AgentSummary[]> {
  return panelRequest<readonly AgentSummary[]>({ path: AGENTS_PATH, method: HTTP_METHOD.GET });
}

export async function createAgent(input: CreateAgentInput): Promise<AgentSummary> {
  return panelRequest<AgentSummary>({ path: AGENTS_PATH, method: HTTP_METHOD.POST, body: input });
}

/** Ativa ou desativa. Nao ha exclusao: a conta aparece em trilha de auditoria e em historico. */
export async function setAgentActive(agentId: string, isActive: boolean): Promise<AgentSummary> {
  return panelRequest<AgentSummary>({
    path: `${AGENTS_PATH}/${encodeURIComponent(agentId)}`,
    method: HTTP_METHOD.PATCH,
    body: { isActive },
  });
}

/**
 * Sobe a foto como bytes crus, com o tipo no `Content-Type`.
 *
 * Nao vai como `multipart`: ha um arquivo so e nenhum campo junto, e o envelope multipart custaria
 * fronteira, cabecalho por parte e parsing dos dois lados para carregar exatamente o mesmo byte.
 */
export async function setAgentAvatar(agentId: string, file: File): Promise<AgentSummary> {
  return panelRequest<AgentSummary>({
    path: `${AGENTS_PATH}/${encodeURIComponent(agentId)}/avatar`,
    method: HTTP_METHOD.PUT,
    binary: { blob: file, contentType: file.type },
  });
}
