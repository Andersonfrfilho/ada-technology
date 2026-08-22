/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import {
  SCHEDULING_WORKSPACE_AREA,
  type SchedulingWorkspaceArea,
} from '@adatechnology/scheduling-ui';
import { useCallback, useSyncExternalStore } from 'react';

import {
  SCHEDULING_AREA_URL_KEY,
  SCHEDULING_AREA_URL_VALUE,
} from '@/modules/scheduling/scheduling.constant';

const AREA_CHANGE_EVENT = 'ada:scheduling-area-change';

const AREA_TO_URL: Readonly<Record<SchedulingWorkspaceArea, string>> = {
  [SCHEDULING_WORKSPACE_AREA.AGENDA]: SCHEDULING_AREA_URL_VALUE.AGENDA,
  [SCHEDULING_WORKSPACE_AREA.BOOKINGS]: SCHEDULING_AREA_URL_VALUE.BOOKINGS,
  [SCHEDULING_WORKSPACE_AREA.RESOURCES]: SCHEDULING_AREA_URL_VALUE.RESOURCES,
  [SCHEDULING_WORKSPACE_AREA.SERVICES]: SCHEDULING_AREA_URL_VALUE.SERVICES,
  [SCHEDULING_WORKSPACE_AREA.AVAILABILITY]: SCHEDULING_AREA_URL_VALUE.AVAILABILITY,
};

const URL_TO_AREA = Object.fromEntries(
  Object.entries(AREA_TO_URL).map(([area, url]) => [url, area as SchedulingWorkspaceArea]),
) as Readonly<Record<string, SchedulingWorkspaceArea | undefined>>;

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener('popstate', onStoreChange);
  window.addEventListener(AREA_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('popstate', onStoreChange);
    window.removeEventListener(AREA_CHANGE_EVENT, onStoreChange);
  };
}

function readSearch(): string {
  return window.location.search;
}

export type SchedulingAreaNavigation = {
  readonly area: SchedulingWorkspaceArea;
  readonly setArea: (area: SchedulingWorkspaceArea) => void;
};

/**
 * A area aberta na query string, como no catalogo.
 *
 * `replaceState` porque trocar de aba nao e passo de navegacao: o voltar do navegador tem de sair
 * do agendamento, e nao desfazer um clique de aba.
 */
export function useSchedulingArea(): SchedulingAreaNavigation {
  const search = useSyncExternalStore(subscribe, readSearch);

  const setArea = useCallback((next: SchedulingWorkspaceArea): void => {
    const params = new URLSearchParams(window.location.search);
    params.set(SCHEDULING_AREA_URL_KEY, AREA_TO_URL[next]);

    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    window.dispatchEvent(new Event(AREA_CHANGE_EVENT));
  }, []);

  const raw = new URLSearchParams(search).get(SCHEDULING_AREA_URL_KEY) ?? '';

  return { area: URL_TO_AREA[raw] ?? SCHEDULING_WORKSPACE_AREA.AGENDA, setArea };
}
