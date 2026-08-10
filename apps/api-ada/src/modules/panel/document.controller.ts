/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { environment } from '@/infra/config/environment';
import { metaWhatsApp } from '@/infra/container';
import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { jsonData } from '@/infra/http/responses';
import { AUTH_REQUIREMENT, HTTP_METHOD, type Route } from '@/infra/http/router';
import { PANEL_DOCUMENTS_DEFAULT_LIMIT } from '@/modules/panel/panel.constant';
import { panelDocumentsQuerySchema } from '@/modules/panel/panel.schema';

const DOCUMENTS_PATH = '/v1/panel/documents';

const companyId = environment.ADA_COMPANY_ID;

/**
 * A biblioteca e a mesma dos anexos da conversa, vista de cima.
 *
 * O envelope aqui foge do `jsonList`: o `conversations-ui` espera `{ documents, total }` nesta rota
 * especifica, e traduzir na borda do painel seria inventar um formato que nem a API nem o pacote
 * usam. O `data` externo continua sendo o do padrao.
 */
const listRoute: Route = {
  method: HTTP_METHOD.GET,
  path: DOCUMENTS_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_READ,
  handler: async ({ url }) => {
    const query = panelDocumentsQuerySchema.parse(Object.fromEntries(url.searchParams));

    const page = await metaWhatsApp.conversations.listCompanyDocuments.execute({
      companyId,
      page: query.page ?? 1,
      limit: query.limit ?? PANEL_DOCUMENTS_DEFAULT_LIMIT,
      sortDirection: query.sortDirection ?? 'desc',
      ...(query.search ? { search: query.search } : {}),
      ...(query.source && query.source.length > 0 ? { sources: query.source } : {}),
    });

    return jsonData(page);
  },
};

export const panelDocumentRoutes: readonly Route[] = [listRoute];
