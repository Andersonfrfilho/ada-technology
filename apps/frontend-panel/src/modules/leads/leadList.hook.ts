/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import {
  useDebouncedValue,
  useUrlArrayState,
  useUrlNumberState,
  useUrlStringState,
} from '@adatechnology/conversations-ui';

import {
  isLeadSortField,
  LEAD_SORT_FIELD,
  LEADS_DEFAULT_PER_PAGE,
  LEADS_URL_KEY,
  type LeadSortField,
} from '@/modules/leads/leads.constant';
import { useLeadsQuery } from '@/modules/leads/leads.query';
import type { Lead } from '@/modules/leads/types/lead.types';

const DEFAULT_SORT_DIRECTION = 'desc';

export type LeadListState = {
  readonly leads: readonly Lead[];
  readonly total: number;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly search: string;
  readonly channels: readonly string[];
  readonly sortBy: LeadSortField;
  readonly sortDirection: 'asc' | 'desc';
  readonly page: number;
  readonly perPage: number;
  readonly hasActiveFilters: boolean;
  readonly setSearch: (search: string) => void;
  readonly setChannels: (channels: readonly string[]) => void;
  readonly setPage: (page: number) => void;
  readonly setPerPage: (perPage: number) => void;
  readonly toggleSort: (field: string) => void;
  readonly clearFilters: () => void;
};

/**
 * Filtro, ordenacao e pagina moram na URL; a lista e derivada deles.
 *
 * Nada disso vira `useState` local: o atendente que manda a URL a um colega manda junto a lista que
 * esta vendo, e recarregar a pagina no meio de uma triagem nao apaga o que ele filtrou.
 */
export function useLeadList(): LeadListState {
  const [search, setSearch] = useUrlStringState(LEADS_URL_KEY.SEARCH, '');
  const [channels, setChannels] = useUrlArrayState(LEADS_URL_KEY.CHANNEL);
  const [sortBy, setSortBy] = useUrlStringState(LEADS_URL_KEY.SORT_BY, LEAD_SORT_FIELD.LAST_ACTIVITY_AT);
  const [sortDirection, setSortDirection] = useUrlStringState(
    LEADS_URL_KEY.SORT_DIRECTION,
    DEFAULT_SORT_DIRECTION,
  );
  const [page, setPage] = useUrlNumberState(LEADS_URL_KEY.PAGE, 1);
  const [perPage, setPerPage] = useUrlNumberState(LEADS_URL_KEY.PER_PAGE, LEADS_DEFAULT_PER_PAGE);

  const debouncedSearch = useDebouncedValue(search);
  const safeSortBy = isLeadSortField(sortBy) ? sortBy : LEAD_SORT_FIELD.LAST_ACTIVITY_AT;
  const safeDirection = sortDirection === 'asc' ? 'asc' : DEFAULT_SORT_DIRECTION;

  const query = useLeadsQuery({
    page,
    perPage,
    channels,
    search: debouncedSearch,
    sortBy: safeSortBy,
    sortDirection: safeDirection,
  });

  /** Filtrar reposiciona a lista: manter a pagina 7 apos filtrar mostraria uma tabela vazia. */
  function handleSearch(next: string): void {
    setSearch(next);
    setPage(1);
  }

  function handleChannels(next: readonly string[]): void {
    setChannels(next);
    setPage(1);
  }

  function toggleSort(field: string): void {
    if (!isLeadSortField(field)) return;

    setSortDirection(field === safeSortBy && safeDirection === 'desc' ? 'asc' : DEFAULT_SORT_DIRECTION);
    setSortBy(field);
    setPage(1);
  }

  function clearFilters(): void {
    setSearch('');
    setChannels([]);
    setSortBy(LEAD_SORT_FIELD.LAST_ACTIVITY_AT);
    setSortDirection(DEFAULT_SORT_DIRECTION);
    setPage(1);
  }

  return {
    leads: query.data?.items ?? [],
    total: query.data?.pagination.total ?? 0,
    isLoading: query.isPending,
    isError: query.isError,
    search,
    channels,
    sortBy: safeSortBy,
    sortDirection: safeDirection,
    page,
    perPage,
    hasActiveFilters: hasActiveFilters({ search, channels, sortBy: safeSortBy, sortDirection: safeDirection }),
    setSearch: handleSearch,
    setChannels: handleChannels,
    setPage,
    setPerPage,
    toggleSort,
    clearFilters,
  };
}

type ActiveFiltersParams = {
  readonly search: string;
  readonly channels: readonly string[];
  readonly sortBy: LeadSortField;
  readonly sortDirection: string;
};

/** "Limpar" so aparece quando ha o que limpar — botao morto na tela e ruido. */
function hasActiveFilters({ search, channels, sortBy, sortDirection }: ActiveFiltersParams): boolean {
  if (search !== '' || channels.length > 0) return true;

  return sortBy !== LEAD_SORT_FIELD.LAST_ACTIVITY_AT || sortDirection !== DEFAULT_SORT_DIRECTION;
}
