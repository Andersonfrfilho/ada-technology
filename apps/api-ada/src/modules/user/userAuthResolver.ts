/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { AuthContext, AuthContextResolverPort } from '@adatechnology/module-http';

import { environment } from '@/infra/config/environment';
import { userModule } from '@/infra/container';
import { AUTH_SCHEME } from '@/modules/agent/agent.constant';
import { USER_ADMIN_SCOPE } from '@/modules/user/user.constant';
import { AGENT_ROLE } from '@/shared/constants/domain.constant';

const SCHEME_PREFIX = `${AUTH_SCHEME} `;

/**
 * Identidade do painel traduzida para o contrato do modulo.
 *
 * Diferente do catalogo: as rotas `/admin/users` do `user-module` declaram `requiredScopes:
 * ['user:admin']`, entao o escopo devolvido aqui e a propria barreira no despachante do modulo,
 * nao so uma declaracao para o futuro — sem ele, um atendente admin passaria pelo `auth: ADMIN`
 * da rota-ponte e ainda tomaria 403 dentro do modulo.
 *
 * O token e verificado aqui de novo (nunca reaproveitado do router) porque `dispatchRoute` so
 * entrega headers ao resolver — mesma verificacao criptografica, nada confiado ao chamador.
 */
export const userAuthResolver: AuthContextResolverPort = {
  async resolve({ headers }): Promise<AuthContext | undefined> {
    const header = headers['authorization'];
    if (!header?.startsWith(SCHEME_PREFIX)) return undefined;

    const token = header.slice(SCHEME_PREFIX.length).trim();
    if (!token) return undefined;

    const claims = await userModule.verifyAccessToken(token);
    if (!claims) return undefined;

    const scopes = claims.role === AGENT_ROLE.ADMIN ? [USER_ADMIN_SCOPE] : [];

    return { companyId: environment.ADA_COMPANY_ID, userId: claims.sub, scopes };
  },
};
