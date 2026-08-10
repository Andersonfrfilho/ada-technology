/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { z } from 'zod';

import { environment } from '@/infra/config/environment';
import { panelLeads } from '@/infra/container';
import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { jsonList } from '@/infra/http/responses';
import { AUTH_REQUIREMENT, HTTP_METHOD, type Route } from '@/infra/http/router';
import { PANEL_LEADS_DEFAULT_LIMIT } from '@/modules/panel/panel.constant';
import { panelLeadsQuerySchema } from '@/modules/panel/panel.schema';
import { LEAD_SORT_FIELD, type ListLeadsParams } from '@/modules/panel/types/lead.types';

const LEADS_PATH = '/v1/panel/leads';

const companyId = environment.ADA_COMPANY_ID;

/**
 * A ordem padrao e a atividade mais recente, nao a captura.
 *
 * Quem abre a tela quer saber com quem falar agora; o lead de ontem que respondeu ha um minuto vale
 * mais que o de hoje de manha que sumiu. Ordenar por captura fica a um clique no cabecalho.
 */
const listRoute: Route = {
  method: HTTP_METHOD.GET,
  path: LEADS_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_READ,
  handler: async ({ url }) => {
    const query = panelLeadsQuerySchema.parse(Object.fromEntries(url.searchParams));
    const page = await panelLeads.list(toListParams(query));

    return jsonList(page.items, {
      total: page.total,
      page: page.page,
      perPage: page.perPage,
    });
  },
};

type LeadsQuery = z.infer<typeof panelLeadsQuerySchema>;

/** `exactOptionalPropertyTypes` separa chave ausente de chave com `undefined`; o zod produz a segunda. */
function toListParams(query: LeadsQuery): ListLeadsParams {
  return {
    companyId,
    page: query.page ?? 1,
    limit: query.limit ?? PANEL_LEADS_DEFAULT_LIMIT,
    channels: query.channel ?? [],
    sortBy: query.sortBy ?? LEAD_SORT_FIELD.LAST_ACTIVITY_AT,
    sortDirection: query.sortDirection ?? 'desc',
    ...(query.search ? { search: query.search } : {}),
  };
}

export const panelLeadRoutes: readonly Route[] = [listRoute];
