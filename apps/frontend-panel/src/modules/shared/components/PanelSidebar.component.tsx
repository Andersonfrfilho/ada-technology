/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { LogOut } from 'lucide-react';

import { signOutAgent } from '@/modules/auth/auth.api';
import {
  PANEL_SECTION_ITEMS,
  type PanelSection,
} from '@/modules/shared/navigation/panelSection.constant';
import { useSessionStore } from '@/modules/shared/session/session.store';
import sharedLocale from '@/modules/shared/shared.locale.json';

const locale = sharedLocale.nav;

const ITEM_BASE =
  'flex min-h-11 w-full items-center gap-3 rounded-panel px-3 text-sm transition-colors';
const ITEM_ACTIVE = 'bg-brand-50 font-medium text-brand-600 dark:bg-gray-800 dark:text-white';
const ITEM_IDLE =
  'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white';

export type PanelSidebarProps = {
  section: PanelSection;
  onNavigate: (section: PanelSection) => void;
};

export function PanelSidebar({ section, onNavigate }: PanelSidebarProps) {
  const agentName = useSessionStore((state) => state.agent?.name);
  const signOut = useSessionStore((state) => state.signOut);

  // A sessao cai localmente mesmo se a rota falhar: manter a tela aberta apos o clique e pior.
  function handleSignOut(): void {
    signOutAgent()
      .catch(() => undefined)
      .finally(signOut);
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-800">
        <p className="text-xs font-semibold tracking-widest text-brand-500 uppercase">
          {locale.brand}
        </p>
        <h1 className="text-sm font-semibold text-gray-900 dark:text-white">{locale.title}</h1>
      </div>

      <nav aria-label={locale.title} className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {PANEL_SECTION_ITEMS.map((item) => (
          <button
            aria-current={item.section === section ? 'page' : undefined}
            className={`${ITEM_BASE} ${item.section === section ? ITEM_ACTIVE : ITEM_IDLE}`}
            key={item.section}
            onClick={() => onNavigate(item.section)}
            type="button"
          >
            <item.icon aria-hidden="true" className="size-4 shrink-0" />
            {locale.sections[item.section]}
          </button>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-2 dark:border-gray-800">
        {agentName ? (
          <p className="truncate px-3 pb-1 text-xs text-gray-500 dark:text-gray-400">{agentName}</p>
        ) : null}
        <button className={`${ITEM_BASE} ${ITEM_IDLE}`} onClick={handleSignOut} type="button">
          <LogOut aria-hidden="true" className="size-4 shrink-0" />
          {locale.signOut}
        </button>
      </div>
    </div>
  );
}
