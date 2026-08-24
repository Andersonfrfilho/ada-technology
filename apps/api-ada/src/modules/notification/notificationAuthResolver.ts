/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { AuthContext, AuthContextResolverPort } from '@adatechnology/module-http';

import { environment } from '@/infra/config/environment';
import { verifyAccessToken } from '@/modules/agent/accessToken';
import { AUTH_SCHEME } from '@/modules/agent/agent.constant';
import { NOTIFICATION_ADMIN_SCOPE } from '@/modules/notification/notification.constant';
import { AGENT_ROLE } from '@/shared/constants/domain.constant';

const SCHEME_PREFIX = `${AUTH_SCHEME} `;

/**
 * Identidade do painel traduzida para o contrato do modulo, como na agenda.
 *
 * O `userId` importa mais aqui do que nos outros modulos: as rotas de inbox sao de escopo `user` e
 * o despachante recusa quem chegar sem ele — a caixa de um atendente e dele, nao da empresa.
 *
 * A empresa vem do ambiente, nunca do corpo nem de header: este produto atende uma empresa so, e
 * deixar o cliente escolher o tenant seria a falha classica de BOLA (`security.md` §2).
 *
 * O token e verificado pelo `accessToken` do `agent`, e nao pelo `userModule`, porque o modulo de
 * notificacao e montado no proprio container: importar `userModule` daqui fecharia um ciclo com o
 * `container.ts`. Os dois emissores compartilham `issuer`/`audience` de proposito enquanto
 * convivem, entao a verificacao aceita o mesmo token.
 */
export const notificationAuthResolver: AuthContextResolverPort = {
  async resolve({ headers }): Promise<AuthContext | undefined> {
    const header = headers['authorization'];
    if (!header?.startsWith(SCHEME_PREFIX)) return undefined;

    const token = header.slice(SCHEME_PREFIX.length).trim();
    if (!token) return undefined;

    const agent = await verifyAccessToken(token);
    if (!agent) return undefined;

    const scopes = agent.role === AGENT_ROLE.ADMIN ? [NOTIFICATION_ADMIN_SCOPE] : [];

    return { companyId: environment.ADA_COMPANY_ID, userId: agent.agentId, scopes };
  },
};
