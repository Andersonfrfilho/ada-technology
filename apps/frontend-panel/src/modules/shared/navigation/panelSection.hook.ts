/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { useCallback, useSyncExternalStore } from 'react';

import {
  DEFAULT_PANEL_SECTION,
  isPanelSection,
  type PanelSection,
} from '@/modules/shared/navigation/panelSection.constant';

/**
 * Navegacao sobre o `history` cru, e nao sobre um roteador.
 *
 * As telas do `conversations-ui` gravam filtro, ordenacao e pagina direto com `history.replaceState`,
 * de proposito, para nao amarrar o pacote a um roteador. Um roteador que guardasse a propria copia da
 * localizacao passaria a discordar dessas gravacoes e apagaria o filtro do atendente no proximo
 * render. Aqui a divisao e limpa: o shell manda no caminho, a tela manda na query string.
 */
const SECTION_CHANGE_EVENT = 'ada:panel-section-change';

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener('popstate', onStoreChange);
  window.addEventListener(SECTION_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('popstate', onStoreChange);
    window.removeEventListener(SECTION_CHANGE_EVENT, onStoreChange);
  };
}

function readPathname(): string {
  return window.location.pathname;
}

export type PanelQuery = Readonly<Record<string, string>>;

export type PanelNavigation = {
  readonly section: PanelSection;
  readonly navigate: (section: PanelSection, query?: PanelQuery) => void;
};

export function usePanelSection(): PanelNavigation {
  const pathname = useSyncExternalStore(subscribe, readPathname);

  /**
   * A query string nunca e herdada, so passada de proposito.
   *
   * Levar a da tela anterior confundiria (o `?busca=` de clientes viraria filtro de conversas), mas
   * abrir a conversa de um lead precisa dizer qual — entao quem navega declara o que leva.
   */
  const navigate = useCallback((next: PanelSection, query?: PanelQuery): void => {
    const search = new URLSearchParams(query).toString();
    const target = search ? `/${next}?${search}` : `/${next}`;

    if (`${readPathname()}${window.location.search}` === target) return;

    window.history.pushState(null, '', target);
    window.dispatchEvent(new Event(SECTION_CHANGE_EVENT));
  }, []);

  return { section: toSection(pathname), navigate };
}

/** Caminho desconhecido cai na fila em vez de dar tela em branco: URL velha ainda abre o painel. */
function toSection(pathname: string): PanelSection {
  const candidate = pathname.replace(/^\/+/, '').split('/')[0] ?? '';

  return isPanelSection(candidate) ? candidate : DEFAULT_PANEL_SECTION;
}
