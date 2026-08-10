/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { AgentEmailAlreadyExistsError } from '@/modules/agent/agent.error';
import type {
  AgentProfile,
  CreateAgentDependencies,
  CreateAgentParams,
} from '@/modules/agent/types/agent.types';

export class CreateAgentUseCase {
  constructor(private readonly dependencies: CreateAgentDependencies) {}

  async execute({ email, name, password, role }: CreateAgentParams): Promise<AgentProfile> {
    const { agents } = this.dependencies;
    const normalizedEmail = email.trim().toLowerCase();

    if (await agents.findByEmail(normalizedEmail)) throw new AgentEmailAlreadyExistsError();

    // `Bun.password.hash` usa argon2id com os parametros recomendados do runtime — a senha em claro
    // nao passa daqui, e o hash e o unico formato que chega ao banco.
    return agents.create({
      email: normalizedEmail,
      name: name.trim(),
      role,
      passwordHash: await Bun.password.hash(password),
    });
  }
}
