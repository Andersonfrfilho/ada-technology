/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { Menu, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { PanelSectionView } from '@/modules/shared/components/PanelSectionView.component';
import { PanelSidebar } from '@/modules/shared/components/PanelSidebar.component';
import type { PanelSection } from '@/modules/shared/navigation/panelSection.constant';
import { usePanelSection } from '@/modules/shared/navigation/panelSection.hook';
import sharedLocale from '@/modules/shared/shared.locale.json';

const locale = sharedLocale.nav;

const ICON_BUTTON =
  'flex size-11 items-center justify-center rounded-panel text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800';

/**
 * A barra fixa a esquerda vira gaveta abaixo de `desktop:`.
 *
 * As duas montam a mesma `PanelSidebar` — a diferenca esta em quem a envolve, nao numa segunda copia
 * do menu que dessincronizaria na primeira secao nova.
 */
export function PanelShell() {
  const { section, navigate } = usePanelSection();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  function handleNavigate(next: PanelSection): void {
    navigate(next);
    closeDrawer();
  }

  useEscapeToClose({ isOpen: isDrawerOpen, onClose: closeDrawer });

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-950">
      <aside className="hidden desktop:block">
        <PanelSidebar onNavigate={handleNavigate} section={section} />
      </aside>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-20 flex desktop:hidden">
          <button
            aria-label={locale.closeMenu}
            className="absolute inset-0 bg-gray-900/50"
            onClick={closeDrawer}
            type="button"
          />
          <div className="relative">
            <PanelSidebar onNavigate={handleNavigate} section={section} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-gray-200 bg-white px-2 py-1 desktop:hidden dark:border-gray-800 dark:bg-gray-900">
          <button
            aria-label={isDrawerOpen ? locale.closeMenu : locale.openMenu}
            className={ICON_BUTTON}
            onClick={() => setIsDrawerOpen((open) => !open)}
            type="button"
          >
            {isDrawerOpen ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
          <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {locale.sections[section]}
          </span>
        </header>

        <main className="min-h-0 flex-1">
          <PanelSectionView section={section} />
        </main>
      </div>
    </div>
  );
}

type EscapeToCloseParams = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
};

/** A gaveta cobre a tela inteira no telefone; sem isto so o toque no fundo a fecha. */
function useEscapeToClose({ isOpen, onClose }: EscapeToCloseParams): void {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
}
