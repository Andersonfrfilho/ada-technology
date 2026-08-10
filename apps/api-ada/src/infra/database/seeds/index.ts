/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { parseArgs } from 'node:util';

import { closeDatabase } from '@/infra/database/client';
import { CreateAgentUseCase } from '@/modules/agent/createAgent.use-case';
import { DrizzleAgentRepository } from '@/modules/agent/DrizzleAgentRepository';
import { AGENT_ROLE, type AgentRole } from '@/shared/constants/domain.constant';
import { logger } from '@/shared/logger';

const SOURCE = 'seed';
const MIN_PASSWORD_LENGTH = 12;

/**
 * A senha entra pela entrada padrao, nunca por argumento.
 *
 * Argumento de linha de comando aparece em `ps`, no historico do shell e no log do executor de
 * deploy — tres lugares onde a senha do primeiro administrador nao pode aparecer.
 */
async function readPassword(): Promise<string> {
  const password = (await Bun.stdin.text()).trim();

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Senha ausente ou curta demais (minimo de ${MIN_PASSWORD_LENGTH} caracteres)`);
  }

  return password;
}

function parseRole(value: string | undefined): AgentRole {
  if (!value) return AGENT_ROLE.ADMIN;
  if (value !== AGENT_ROLE.ADMIN && value !== AGENT_ROLE.AGENT) {
    throw new Error(`Papel invalido: use "${AGENT_ROLE.ADMIN}" ou "${AGENT_ROLE.AGENT}"`);
  }

  return value;
}

async function seed(): Promise<void> {
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      name: { type: 'string' },
      role: { type: 'string' },
    },
  });

  if (!values.email || !values.name) {
    throw new Error('Use: bun run db:seed --email <e-mail> --name "<nome>" < senha.txt');
  }

  const agents = new DrizzleAgentRepository();

  // Seed roda de novo a cada deploy; repetir a criacao derrubaria o processo por conta do indice
  // unico de e-mail, e nao ha nada a corrigir quando a conta ja existe.
  const existing = await agents.findByEmail(values.email);
  if (existing) {
    logger.info({ message: 'Atendente ja existe, nada a fazer', source: SOURCE, meta: { agentId: existing.id } });
    return;
  }

  const created = await new CreateAgentUseCase({ agents }).execute({
    email: values.email,
    name: values.name,
    password: await readPassword(),
    role: parseRole(values.role),
  });

  logger.info({
    message: 'Atendente criado',
    source: SOURCE,
    meta: { agentId: created.id, role: created.role },
  });
}

try {
  await seed();
} finally {
  await closeDatabase();
}
