/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { formatDateTime, SortableHead, type SortDirection } from '@adatechnology/conversations-ui';
import { MessageSquare } from 'lucide-react';

import { LEAD_SORT_FIELD } from '@/modules/leads/leads.constant';
import leadsLocale from '@/modules/leads/leads.locale.json';
import type { Lead } from '@/modules/leads/types/lead.types';

const CELL = 'px-3 py-2 text-sm text-ink-900 dark:text-gray-100';
const HEAD = 'text-gray-500 dark:text-gray-400';

export type LeadTableProps = {
  readonly leads: readonly Lead[];
  readonly sortBy: string;
  readonly sortDirection: SortDirection;
  readonly onSort: (field: string) => void;
  readonly onOpenConversation: (conversationId: string) => void;
};

export function LeadTable({ leads, sortBy, sortDirection, onSort, onOpenConversation }: LeadTableProps) {
  return (
    /** Tabela nunca empurra a pagina: o scroll horizontal e dela, nao do corpo. */
    <div className="overflow-x-auto">
      <table className="w-full min-w-3xl border-collapse whitespace-nowrap">
        <thead className="border-b border-gray-200 dark:border-gray-700">
          <tr>
            <SortableHead
              label={leadsLocale.columns.name}
              field={LEAD_SORT_FIELD.NAME}
              activeField={sortBy}
              direction={sortDirection}
              onSort={onSort}
              className={HEAD}
            />
            <th scope="col" className={`px-3 py-2 text-left text-xs font-medium ${HEAD}`}>
              {leadsLocale.columns.contact}
            </th>
            <th scope="col" className={`px-3 py-2 text-left text-xs font-medium ${HEAD}`}>
              {leadsLocale.columns.interest}
            </th>
            <th scope="col" className={`px-3 py-2 text-left text-xs font-medium ${HEAD}`}>
              {leadsLocale.columns.channel}
            </th>
            <SortableHead
              label={leadsLocale.columns.firstContactAt}
              field={LEAD_SORT_FIELD.FIRST_CONTACT_AT}
              activeField={sortBy}
              direction={sortDirection}
              onSort={onSort}
              className={HEAD}
            />
            <SortableHead
              label={leadsLocale.columns.lastActivityAt}
              field={LEAD_SORT_FIELD.LAST_ACTIVITY_AT}
              activeField={sortBy}
              direction={sortDirection}
              onSort={onSort}
              className={HEAD}
            />
            <th scope="col" className="px-3 py-2 text-right">
              <span className="sr-only">{leadsLocale.columns.conversation}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <LeadRow key={lead.conversationId} lead={lead} onOpenConversation={onOpenConversation} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

type LeadRowProps = {
  readonly lead: Lead;
  readonly onOpenConversation: (conversationId: string) => void;
};

function LeadRow({ lead, onOpenConversation }: LeadRowProps) {
  return (
    <tr className="border-b border-gray-100 odd:bg-gray-50/60 hover:bg-brand-50/60 dark:border-gray-800 dark:odd:bg-gray-900/40 dark:hover:bg-gray-800">
      <td className={`${CELL} font-medium`}>
        {lead.name ?? leadsLocale.noValue}
        {lead.waitingHuman ? (
          <span className="ml-2 rounded-panel bg-accent-500/15 px-2 py-0.5 text-xs text-accent-500">
            {leadsLocale.waitingHuman}
          </span>
        ) : null}
      </td>
      <td className={CELL}>{lead.contact ?? leadsLocale.noValue}</td>
      <td className={CELL}>{lead.interest ?? leadsLocale.noValue}</td>
      <td className={CELL}>{channelLabel(lead.channel)}</td>
      <td className={CELL}>{formatDateTime(lead.firstContactAt)}</td>
      <td className={CELL}>{formatDateTime(lead.lastActivityAt)}</td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={() => onOpenConversation(lead.conversationId)}
          className="cv-header-action inline-flex items-center gap-2"
        >
          <MessageSquare aria-hidden="true" className="size-4" />
          {leadsLocale.openConversation}
        </button>
      </td>
    </tr>
  );
}

const CHANNEL_LABEL: Readonly<Record<string, string>> = leadsLocale.channels;

function channelLabel(channel: string): string {
  return CHANNEL_LABEL[channel] ?? channel;
}
