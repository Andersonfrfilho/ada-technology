/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import {
  isProductsWorkspaceArea,
  PRODUCTS_WORKSPACE_AREA,
  type ProductsWorkspaceArea,
} from '@adatechnology/products-ui';
import { useCallback, useSyncExternalStore } from 'react';

import { CATALOG_AREA_URL_KEY, CATALOG_AREA_URL_VALUE } from '@/modules/catalog/catalog.constant';

const AREA_CHANGE_EVENT = 'ada:catalog-area-change';

const URL_TO_AREA: Readonly<Record<string, ProductsWorkspaceArea>> = {
  [CATALOG_AREA_URL_VALUE.PRODUCTS]: PRODUCTS_WORKSPACE_AREA.PRODUCTS,
  [CATALOG_AREA_URL_VALUE.CATALOGS]: PRODUCTS_WORKSPACE_AREA.CATALOGS,
};

const AREA_TO_URL: Readonly<Record<ProductsWorkspaceArea, string>> = {
  [PRODUCTS_WORKSPACE_AREA.PRODUCTS]: CATALOG_AREA_URL_VALUE.PRODUCTS,
  [PRODUCTS_WORKSPACE_AREA.CATALOGS]: CATALOG_AREA_URL_VALUE.CATALOGS,
};

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

export type CatalogAreaNavigation = {
  readonly area: ProductsWorkspaceArea;
  readonly setArea: (area: ProductsWorkspaceArea) => void;
};

/**
 * A area aberta mora na query string, como filtro e pagina das outras telas.
 *
 * Sem isto, o refresh e o link colado voltam sempre para produtos — e "me manda a tela dos
 * catalogos" vira instrucao falada em vez de URL. `replaceState` porque trocar de area nao e passo
 * de navegacao: o voltar do navegador tem de sair do catalogo, nao desfazer um clique de aba.
 */
export function useCatalogArea(): CatalogAreaNavigation {
  const search = useSyncExternalStore(subscribe, readSearch);

  const setArea = useCallback((next: ProductsWorkspaceArea): void => {
    const params = new URLSearchParams(window.location.search);
    params.set(CATALOG_AREA_URL_KEY, AREA_TO_URL[next]);

    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    window.dispatchEvent(new Event(AREA_CHANGE_EVENT));
  }, []);

  // Valor estranho na URL abre produtos em vez de tela vazia: query string e entrada de usuario.
  const raw = new URLSearchParams(search).get(CATALOG_AREA_URL_KEY) ?? '';
  const mapped = URL_TO_AREA[raw];

  return {
    area: mapped && isProductsWorkspaceArea(mapped) ? mapped : PRODUCTS_WORKSPACE_AREA.PRODUCTS,
    setArea,
  };
}
