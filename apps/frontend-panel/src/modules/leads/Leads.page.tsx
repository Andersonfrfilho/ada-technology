/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { ListingPagination } from '@adatechnology/conversations-ui';

import { LeadFilters } from '@/modules/leads/components/LeadFilters.component';
import { LeadTable } from '@/modules/leads/components/LeadTable.component';
import { useLeadList } from '@/modules/leads/leadList.hook';
import { LEADS_PER_PAGE_OPTIONS } from '@/modules/leads/leads.constant';
import leadsLocale from '@/modules/leads/leads.locale.json';
import { CONVERSATION_URL_KEY, PANEL_SECTION } from '@/modules/shared/navigation/panelSection.constant';
import { usePanelSection } from '@/modules/shared/navigation/panelSection.hook';

const PAGINATION_LABELS = {
  show: leadsLocale.pagination.show,
  perPage: leadsLocale.pagination.perPage,
  previous: leadsLocale.pagination.previous,
  next: leadsLocale.pagination.next,
  total: (count: number): string => leadsLocale.pagination.total.replace('{count}', String(count)),
  page: (current: number, last: number): string =>
    leadsLocale.pagination.page.replace('{current}', String(current)).replace('{last}', String(last)),
} as const;

const STATE_MESSAGE = 'px-3 py-10 text-center text-sm text-gray-500 dark:text-gray-400';

export function LeadsPage() {
  const list = useLeadList();
  const { navigate } = usePanelSection();

  function handleOpenConversation(conversationId: string): void {
    navigate(PANEL_SECTION.CONVERSATIONS, { [CONVERSATION_URL_KEY]: conversationId });
  }

  return (
    <section className="flex h-full flex-col gap-4 overflow-y-auto p-4 desktop:p-6">
      <header>
        <h1 className="text-lg font-semibold text-ink-900 dark:text-white">{leadsLocale.title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{leadsLocale.subtitle}</p>
      </header>

      <LeadFilters
        search={list.search}
        channels={list.channels}
        hasActiveFilters={list.hasActiveFilters}
        onSearchChange={list.setSearch}
        onChannelsChange={list.setChannels}
        onClear={list.clearFilters}
      />

      <div className="rounded-panel border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <LeadsBody
          state={list}
          onSort={list.toggleSort}
          onOpenConversation={handleOpenConversation}
        />
      </div>

      {list.total > 0 ? (
        <ListingPagination
          page={list.page}
          total={list.total}
          perPage={list.perPage}
          perPageOptions={LEADS_PER_PAGE_OPTIONS}
          onPageChange={list.setPage}
          onPerPageChange={list.setPerPage}
          labels={PAGINATION_LABELS}
        />
      ) : null}
    </section>
  );
}

type LeadsBodyProps = {
  readonly state: ReturnType<typeof useLeadList>;
  readonly onSort: (field: string) => void;
  readonly onOpenConversation: (conversationId: string) => void;
};

/** Carregando, erro e vazio sao estados diferentes: a tabela vazia por filtro nao e falha de rede. */
function LeadsBody({ state, onSort, onOpenConversation }: LeadsBodyProps) {
  if (state.isLoading) return <p className={STATE_MESSAGE}>{leadsLocale.loading}</p>;
  if (state.isError) return <p className={STATE_MESSAGE}>{leadsLocale.loadError}</p>;
  if (state.leads.length === 0) return <p className={STATE_MESSAGE}>{leadsLocale.empty}</p>;

  return (
    <LeadTable
      leads={state.leads}
      sortBy={state.sortBy}
      sortDirection={state.sortDirection}
      onSort={onSort}
      onOpenConversation={onOpenConversation}
    />
  );
}
