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
import { CATALOG_ADMIN_SCOPE } from '@/modules/catalog/catalog.constant';
import { AGENT_ROLE } from '@/shared/constants/domain.constant';

const SCHEME_PREFIX = `${AUTH_SCHEME} `;

/**
 * Identidade do painel traduzida para o contrato do modulo.
 *
 * O modulo nao verifica token nem conhece o emissor da sessao: recebe a identidade pronta e aplica
 * autorizacao por objeto. A empresa vem do ambiente, nunca do corpo nem de header — este produto
 * atende uma empresa so, e deixar o cliente escolher o tenant seria a falha classica de BOLA
 * (`security.md` §2).
 *
 * O token e lido aqui de novo, e nao reaproveitado do router, porque `dispatchRoute` so entrega
 * headers ao resolver. E a mesma verificacao criptografica; nada e confiado ao chamador.
 *
 * A checagem de papel **nao mora aqui**. As rotas do modulo declaram `scope: 'admin'` sem
 * `requiredScopes`, e nesse caso o despachante aceita qualquer identidade — o vocabulario de
 * escopos e do host. Quem recusa o atendente comum e o `auth: ADMIN` da rota-ponte, antes de
 * `handle` ser chamado. O escopo devolvido abaixo e declaracao de papel para o dia em que o modulo
 * exigir, nao a barreira.
 */
export const catalogAuthResolver: AuthContextResolverPort = {
  async resolve({ headers }): Promise<AuthContext | undefined> {
    const header = headers['authorization'];
    if (!header?.startsWith(SCHEME_PREFIX)) return undefined;

    const token = header.slice(SCHEME_PREFIX.length).trim();
    if (!token) return undefined;

    const agent = await verifyAccessToken(token);
    if (!agent) return undefined;

    const scopes = agent.role === AGENT_ROLE.ADMIN ? [CATALOG_ADMIN_SCOPE] : [];

    return { companyId: environment.ADA_COMPANY_ID, userId: agent.agentId, scopes };
  },
};
