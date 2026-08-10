/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { MultiSelectFilter } from '@adatechnology/conversations-ui';
import { FilterX, Search } from 'lucide-react';

import { LEAD_CHANNEL } from '@/modules/leads/leads.constant';
import leadsLocale from '@/modules/leads/leads.locale.json';

const CHANNEL_OPTIONS = [
  { value: LEAD_CHANNEL.WEBCHAT, label: leadsLocale.channels.webchat },
  { value: LEAD_CHANNEL.WHATSAPP, label: leadsLocale.channels.whatsapp },
] as const;

export type LeadFiltersProps = {
  readonly search: string;
  readonly channels: readonly string[];
  readonly hasActiveFilters: boolean;
  readonly onSearchChange: (search: string) => void;
  readonly onChannelsChange: (channels: readonly string[]) => void;
  readonly onClear: () => void;
};

export function LeadFilters({
  search,
  channels,
  hasActiveFilters,
  onSearchChange,
  onChannelsChange,
  onClear,
}: LeadFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative flex min-w-56 flex-1 items-center">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 size-4 text-gray-400"
        />
        <span className="sr-only">{leadsLocale.searchLabel}</span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={leadsLocale.searchPlaceholder}
          className="h-11 w-full rounded-panel border border-gray-200 bg-white pl-9 pr-3 text-sm text-ink-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </label>

      <MultiSelectFilter
        label={leadsLocale.channelFilter}
        options={CHANNEL_OPTIONS}
        selected={channels}
        onChange={onChannelsChange}
      />

      {hasActiveFilters ? (
        <button type="button" onClick={onClear} className="cv-header-action inline-flex items-center gap-2">
          <FilterX aria-hidden="true" className="size-4" />
          {leadsLocale.clearFilters}
        </button>
      ) : null}
    </div>
  );
}
