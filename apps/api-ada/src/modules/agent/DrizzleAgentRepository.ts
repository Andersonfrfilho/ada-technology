/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { asc, desc, eq, sql } from 'drizzle-orm';

import { database } from '@/infra/database/client';
import { agents } from '@/infra/database/schema';
import type {
  AgentUpdateChanges,
  AgentAdminProfile,
  AgentCredentials,
  AgentProfile,
  AgentRepositoryInterface,
  CreateAgentRecord,
} from '@/modules/agent/types/agent.types';
import type { AgentRole } from '@/shared/constants/domain.constant';

export class DrizzleAgentRepository implements AgentRepositoryInterface {
  async findByEmail(email: string): Promise<AgentCredentials | undefined> {
    const [row] = await database
      .select()
      .from(agents)
      .where(eq(agents.email, email.toLowerCase()))
      .limit(1);

    if (!row) return undefined;

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role as AgentRole,
      passwordHash: row.passwordHash,
      isActive: row.isActive,
    };
  }

  async findById(agentId: string): Promise<AgentProfile | undefined> {
    const [row] = await database
      .select({
        id: agents.id,
        email: agents.email,
        name: agents.name,
        role: agents.role,
        isActive: agents.isActive,
      })
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    // Conta desativada some para quem ja tem token: sem isto o acesso duraria ate o token expirar.
    if (!row?.isActive) return undefined;

    return { id: row.id, email: row.email, name: row.name, role: row.role as AgentRole };
  }

  /**
   * Quem pode receber atendimento e aparecer numa agenda.
   *
   * Sem senha e sem `lastSeenAt`: a lista existe para montar grade de horario e escolher titular,
   * nao para inspecionar conta de colega.
   */
  async listActive(): Promise<readonly AgentProfile[]> {
    const rows = await database
      .select({
        id: agents.id,
        email: agents.email,
        name: agents.name,
        role: agents.role,
      })
      .from(agents)
      .where(eq(agents.isActive, true))
      .orderBy(asc(agents.name));

    return rows.map((row) => ({ ...row, role: row.role as AgentRole }));
  }

  async update(agentId: string, changes: AgentUpdateChanges): Promise<AgentAdminProfile | undefined> {
    const [row] = await database
      .update(agents)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(agents.id, agentId))
      .returning({
        id: agents.id,
        email: agents.email,
        name: agents.name,
        role: agents.role,
        isActive: agents.isActive,
        avatarKey: agents.avatarKey,
      });

    return row ? { ...row, role: row.role as AgentRole, avatarKey: row.avatarKey ?? undefined } : undefined;
  }

  /** Devolve so se achou: quem chama usa isso para distinguir token valido de agente removido. */
  async setPasswordHash(agentId: string, passwordHash: string): Promise<boolean> {
    const [row] = await database
      .update(agents)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(agents.id, agentId))
      .returning({ id: agents.id });

    return Boolean(row);
  }

  async setAvatarKey(agentId: string, avatarKey: string): Promise<AgentAdminProfile | undefined> {
    const [row] = await database
      .update(agents)
      .set({ avatarKey, updatedAt: new Date() })
      .where(eq(agents.id, agentId))
      .returning({
        id: agents.id,
        email: agents.email,
        name: agents.name,
        role: agents.role,
        isActive: agents.isActive,
        avatarKey: agents.avatarKey,
      });

    return row ? { ...row, role: row.role as AgentRole, avatarKey: row.avatarKey ?? undefined } : undefined;
  }

  /**
   * TODOS, ativos e inativos, para a tela de administracao.
   *
   * Separada de `listActive` de proposito: a agenda nao pode oferecer titular desativado, e uma
   * flag na mesma funcao acabaria com alguem esquecendo de passa-la — o desativado voltaria a
   * aparecer na grade de horario.
   */
  async listAll(): Promise<readonly AgentAdminProfile[]> {
    const rows = await database
      .select({
        id: agents.id,
        email: agents.email,
        name: agents.name,
        role: agents.role,
        isActive: agents.isActive,
        avatarKey: agents.avatarKey,
      })
      .from(agents)
      // Ativos primeiro: quem administra procura quem trabalha, nao quem saiu.
      .orderBy(desc(agents.isActive), asc(agents.name));

    return rows.map((row) => ({ ...row, role: row.role as AgentRole, avatarKey: row.avatarKey ?? undefined }));
  }

  async setActive(agentId: string, isActive: boolean): Promise<AgentAdminProfile | undefined> {
    const [row] = await database
      .update(agents)
      .set({ isActive })
      .where(eq(agents.id, agentId))
      .returning({
        id: agents.id,
        email: agents.email,
        name: agents.name,
        role: agents.role,
        isActive: agents.isActive,
        avatarKey: agents.avatarKey,
      });

    return row ? { ...row, role: row.role as AgentRole, avatarKey: row.avatarKey ?? undefined } : undefined;
  }

  async create(record: CreateAgentRecord): Promise<AgentProfile> {
    const [row] = await database
      .insert(agents)
      .values({ ...record, email: record.email.toLowerCase() })
      .returning({ id: agents.id, email: agents.email, name: agents.name, role: agents.role });

    if (!row) throw new Error('Insercao de atendente nao devolveu registro');

    return { id: row.id, email: row.email, name: row.name, role: row.role as AgentRole };
  }

  async touchLastSeen(agentId: string): Promise<void> {
    await database
      .update(agents)
      .set({ lastSeenAt: sql`now()` })
      .where(eq(agents.id, agentId));
  }
}
