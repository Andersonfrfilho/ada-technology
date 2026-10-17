/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { TeamWorkspace } from '@adatechnology/user-ui';

import { agentTeamApi } from '@/modules/agents/agentTeam.api';
import { IMAGE_CUTOUT } from '@/modules/shared/imageCutout.constant';
import agentsLocale from '@/modules/agents/agents.locale.json';

/**
 * A tela vem do `@adatechnology/user-ui` — nao remontada aqui (`pluggable-module.md` §4).
 *
 * O que este arquivo faz e traduzir: os rotulos para o vocabulario deste produto ("atendente", e
 * nao "membro") e o adaptador que aponta para a tabela `agents`, que e quem entra neste painel.
 */
export function AgentsPage() {
  return (
    <section className="h-full overflow-y-auto p-4 desktop:p-6">
      <TeamWorkspace
        api={agentTeamApi}
        backgroundRemoval={IMAGE_CUTOUT}
        labels={{
          teamTitle: agentsLocale.title,
          teamSubtitle: agentsLocale.subtitle,
          teamEmpty: agentsLocale.empty,
          teamLoading: agentsLocale.loading,
          teamNewMember: agentsLocale.newAgent,
          teamRole: agentsLocale.role,
          teamRoleAdmin: agentsLocale.roleAdmin,
          teamRoleMember: agentsLocale.roleAgent,
          teamInitialPassword: agentsLocale.password,
          teamInitialPasswordHint: agentsLocale.passwordHint,
          teamCreateSubmit: agentsLocale.submit,
          teamCreating: agentsLocale.submitting,
          teamCreatedMessage: agentsLocale.created,
          teamCancel: agentsLocale.cancel,
          teamPhoto: agentsLocale.photo,
          teamChangePhoto: agentsLocale.changePhoto,
          teamSortBy: agentsLocale.sortBy,
          name: agentsLocale.name,
          email: agentsLocale.email,
        }}
      />
    </section>
  );
}
