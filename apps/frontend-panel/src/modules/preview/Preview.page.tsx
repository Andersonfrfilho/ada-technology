/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { ConversationsProvider, ConversationsWorkspace } from '@adatechnology/conversations-ui';
import { MediaTypesPreview } from '@adatechnology/conversations-ui/preview';
import { Pause, Play } from 'lucide-react';

import inboxLocale from '@/modules/inbox/inbox.locale.json';
import { PREVIEW_TAB, type PreviewTab } from '@/modules/preview/preview.constant';
import { usePreview } from '@/modules/preview/preview.hook';
import previewLocale from '@/modules/preview/preview.locale.json';

const TAB_BASE =
  'rounded-panel px-4 py-2 text-sm font-medium transition-colors min-h-11 min-w-11 dark:text-gray-300';
const TAB_ACTIVE = 'bg-brand-600 text-white dark:text-white';
const TAB_IDLE = 'text-ink-500 hover:bg-gray-100 dark:hover:bg-gray-800';

const TABS: readonly PreviewTab[] = [PREVIEW_TAB.WORKSPACE, PREVIEW_TAB.MEDIA];

/**
 * Tela de avaliacao da interface, servida so em desenvolvimento e fora da autenticacao.
 *
 * A inbox real depende de conversa gravada; nenhuma delas tem midia, porque o widget do site so
 * manda texto. Aqui as fixtures do SDK cobrem imagem, audio e documento — e o roteiro automatico
 * mexe a fila, que parada nao mostra transicao nenhuma.
 */
export function PreviewPage() {
  const { api, sse, tab, isScriptRunning, selectTab, toggleScript } = usePreview();

  const ScriptIcon = isScriptRunning ? Pause : Play;
  const scriptLabel = isScriptRunning ? previewLocale.script.stop : previewLocale.script.start;

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-ink-900 dark:text-white">
              {previewLocale.title}
            </h1>
            <p className="text-sm text-ink-500">{previewLocale.subtitle}</p>
          </div>

          <button
            className="flex min-h-11 items-center gap-2 rounded-panel bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
            onClick={toggleScript}
            type="button"
          >
            <ScriptIcon aria-hidden="true" className="size-4" />
            {scriptLabel}
          </button>
        </div>

        <p className="mt-2 text-xs text-ink-500">
          {isScriptRunning ? previewLocale.script.runningHint : previewLocale.warning}
        </p>

        <nav aria-label={previewLocale.title} className="mt-3 flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              aria-current={tab === item ? 'page' : undefined}
              className={`${TAB_BASE} ${tab === item ? TAB_ACTIVE : TAB_IDLE}`}
              key={item}
              onClick={() => selectTab(item)}
              type="button"
            >
              {previewLocale.tabs[item]}
            </button>
          ))}
        </nav>
      </header>

      <main className="min-h-0 flex-1">
        {tab === PREVIEW_TAB.WORKSPACE ? (
          <ConversationsProvider api={api} sse={sse}>
            <ConversationsWorkspace className="h-full" labels={inboxLocale.labels} />
          </ConversationsProvider>
        ) : (
          <MediaTypesPreview className="h-full" />
        )}
      </main>
    </div>
  );
}
