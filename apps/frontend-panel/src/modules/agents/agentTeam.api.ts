/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { TeamApi } from '@adatechnology/user-ui';

import { createAgent, listAgents } from '@/modules/agents/agents.api';

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
 * `setTeamMemberActive` fica de FORA: o repositorio so lista ativos, entao nao ha inativo para
 * reativar. Ausente, a tela nem desenha a coluna de acao — melhor que um botao que nao tem o que
 * desfazer.
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
      })),
      total: agents.length,
      page,
      pageSize,
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
