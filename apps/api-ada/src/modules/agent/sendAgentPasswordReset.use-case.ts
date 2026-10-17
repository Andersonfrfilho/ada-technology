/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { USER_EVENT, type PasswordResetRequestedEvent } from '@adatechnology/user-contracts';

import { AgentNotFoundError } from '@/modules/agent/agent.error';
import { issueAgentResetToken } from '@/modules/agent/agentPasswordReset';
import type { AgentRepositoryInterface } from '@/modules/agent/types/agent.types';

const TOKEN_PLACEHOLDER = '{token}';

export type SendAgentPasswordResetParams = {
  readonly agentId: string;
};

export type SendAgentPasswordResetDependencies = {
  readonly agents: AgentRepositoryInterface;
  readonly resetUrlTemplate: string;
  readonly notify: (event: PasswordResetRequestedEvent) => Promise<void>;
};

/**
 * Manda o e-mail de redefinicao para um usuario do painel.
 *
 * O envio reusa o `passwordResetNotifier` do `user-module` inteiro — mesmo template editavel pelo
 * painel, mesmo fallback para envio direto quando o modulo de notificacao recusa. O que muda e so
 * de onde vem a pessoa: `agents`, que e quem entra neste painel.
 *
 * Ao contrario da rota publica de redefinicao, aqui o 404 e legitimo: quem chama ja esta
 * autenticado como administrador e ja enxerga a lista inteira, entao nao ha cadastro a revelar.
 */
export class SendAgentPasswordResetUseCase {
  constructor(private readonly dependencies: SendAgentPasswordResetDependencies) {}

  async execute({ agentId }: SendAgentPasswordResetParams): Promise<void> {
    const agent = await this.dependencies.agents.findById(agentId);
    if (!agent) throw new AgentNotFoundError(agentId);

    const { token } = await issueAgentResetToken(agentId);

    await this.dependencies.notify({
      type: USER_EVENT.PASSWORD_RESET_REQUESTED,
      occurredAt: new Date(),
      email: agent.email,
      resetUrl: this.dependencies.resetUrlTemplate.replace(TOKEN_PLACEHOLDER, encodeURIComponent(token)),
    });
  }
}
