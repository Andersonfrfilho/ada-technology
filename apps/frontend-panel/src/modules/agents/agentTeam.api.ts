/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { TeamApi } from '@adatechnology/user-ui';

import { PanelApiError } from '@/modules/shared/http/http.error';

import {
  createAgent,
  listAgents,
  sendAgentPasswordReset,
  setAgentActive,
  setAgentAvatar,
  updateAgent,
} from '@/modules/agents/agents.api';

/**
 * A tela de equipe do `@adatechnology/user-ui` sobre a tabela `agents`.
 *
 * O pacote administra `user` do `user-module`; quem entra NESTE painel e `agent`. Sao tabelas
 * diferentes enquanto os dois sistemas convivem, e ligar a tela nas rotas de `user` criaria pessoas
 * que nao conseguem fazer login — o mesmo tropeco que ja apareceu no destinatario de notificacao.
 *
 * Por isso o adaptador: a tela nao sabe de onde vem a lista, e este arquivo e o unico lugar que
 * precisa mudar no dia em que o login migrar para o `user-module`.
 *
 */
export const agentTeamApi: TeamApi = {
  async listTeam({ page, pageSize }) {
    const agents = await listAgents();

    /**
     * Paginacao no cliente: a rota devolve a equipe inteira, que e dezenas de linhas, nao milhares.
     * Paginar no servidor antes de existir volume seria complexidade sem problema.
     */
    const start = (page - 1) * pageSize;

    return {
      items: agents.slice(start, start + pageSize).map((agent) => ({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        email: agent.email ?? '',
        isActive: agent.isActive ?? true,
        ...(agent.avatarUrl ? { avatarUrl: agent.avatarUrl } : {}),
      })),
      total: agents.length,
      page,
      pageSize,
    };
  },

  async setTeamMemberActive(userId, isActive) {
    const updated = await setAgentActive(userId, isActive);

    return {
      id: updated.id,
      name: updated.name,
      role: updated.role,
      email: updated.email ?? '',
      isActive: updated.isActive ?? isActive,
    };
  },

  async updateTeamMember(userId, input) {
    const updated = await withTranslatedEmailConflict(() =>
      updateAgent(userId, {
        name: input.name,
        role: input.role,
        ...(input.email ? { email: input.email } : {}),
      }),
    );

    return {
      id: updated.id,
      name: updated.name,
      role: updated.role,
      email: updated.email ?? '',
      isActive: updated.isActive ?? true,
      ...(updated.avatarUrl ? { avatarUrl: updated.avatarUrl } : {}),
    };
  },

  async sendPasswordReset(userId) {
    await sendAgentPasswordReset(userId);
  },

  async setTeamMemberAvatar(userId, file) {
    const updated = await setAgentAvatar(userId, file);

    return {
      id: updated.id,
      name: updated.name,
      role: updated.role,
      email: updated.email ?? '',
      isActive: updated.isActive ?? true,
      ...(updated.avatarUrl ? { avatarUrl: updated.avatarUrl } : {}),
    };
  },

  async createTeamMember(input) {
    const created = await createAgent(input);

    return {
      id: created.id,
      name: created.name,
      role: created.role,
      email: created.email ?? '',
      isActive: true,
    };
  },
};

/**
 * Traduz o codigo do host para o do SDK.
 *
 * A API fala `AGENT_EMAIL_ALREADY_EXISTS` — vocabulario deste produto, onde quem entra e `agent`. A
 * tela do pacote administra `user` e reconhece `USER_EMAIL_ALREADY_EXISTS` para ancorar o erro no
 * campo de e-mail. O adaptador e o unico lugar que conhece os dois lados, e e por isso que ele
 * existe: sem esta traducao a recusa chegaria como aviso generico, longe do campo que a causou.
 */
async function withTranslatedEmailConflict<TResult>(run: () => Promise<TResult>): Promise<TResult> {
  try {
    return await run();
  } catch (cause) {
    if (cause instanceof PanelApiError && cause.code === AGENT_EMAIL_ALREADY_EXISTS) {
      throw new PanelApiError({
        code: USER_EMAIL_ALREADY_EXISTS,
        message: cause.message,
        status: cause.status,
      });
    }

    throw cause;
  }
}

const AGENT_EMAIL_ALREADY_EXISTS = 'AGENT_EMAIL_ALREADY_EXISTS';
/** Espelha o codigo que o `@adatechnology/user-ui` reconhece para ancorar o erro no campo. */
const USER_EMAIL_ALREADY_EXISTS = 'USER_EMAIL_ALREADY_EXISTS';
