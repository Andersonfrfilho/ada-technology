/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { AgentRepositoryInterface } from '@/modules/agent/types/agent.types';
import type {
  SchedulableAgent,
  SchedulingRepositoryInterface,
} from '@/modules/scheduling/types/scheduling.types';

/**
 * Quem o bot pode oferecer para atender.
 *
 * Estar ativo nao basta: pessoa sem faixa semanal cadastrada nunca teria horario livre, e oferece-la
 * so produz uma lista vazia depois da escolha — frustracao com dois toques a mais.
 *
 * Com a agenda desligada a lista e vazia, e nao um erro: quem chama esta perguntando o que oferecer,
 * e a resposta e "nada".
 */
export class ListSchedulableAgentsUseCase {
  constructor(
    private readonly agents: AgentRepositoryInterface,
    private readonly scheduling: SchedulingRepositoryInterface,
  ) {}

  async execute(): Promise<readonly SchedulableAgent[]> {
    const settings = await this.scheduling.getSettings();
    if (!settings.isEnabled) return [];

    const [profiles, rules] = await Promise.all([this.agents.listActive(), this.scheduling.listRules()]);
    const withRules = new Set(rules.map((rule) => rule.agentId));

    return profiles
      .filter((profile) => withRules.has(profile.id))
      .map((profile) => ({ id: profile.id, name: profile.name }));
  }
}
