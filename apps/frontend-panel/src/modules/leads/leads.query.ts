/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { LEADS_PATH, LEADS_QUERY_KEY } from '@/modules/leads/leads.constant';
import type { FetchLeadsParams, Lead } from '@/modules/leads/types/lead.types';
import { panelListRequest, type PanelList } from '@/modules/shared/http/panelHttpClient';

export function useLeadsQuery(params: FetchLeadsParams): UseQueryResult<PanelList<Lead>> {
  return useQuery({
    queryKey: [LEADS_QUERY_KEY, params],
    queryFn: () => fetchLeads(params),
    /** Lista de cadastro muda devagar; refazer a chamada a cada foco de janela so pisca a tabela. */
    refetchOnWindowFocus: false,
  });
}

function fetchLeads(params: FetchLeadsParams): Promise<PanelList<Lead>> {
  return panelListRequest<Lead>({
    path: LEADS_PATH,
    query: {
      page: params.page,
      limit: params.perPage,
      sortBy: params.sortBy,
      sortDirection: params.sortDirection,
      ...(params.search ? { search: params.search } : {}),
      ...(params.channels.length > 0 ? { channel: params.channels.join(',') } : {}),
    },
  });
}
