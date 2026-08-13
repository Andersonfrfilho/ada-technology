/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { ProductsProvider, ProductsWorkspace } from '@adatechnology/products-ui';

import { catalogApi } from '@/modules/catalog/catalog.api';
import catalogLocale from '@/modules/catalog/catalog.locale.json';
import { PRODUCTS_CONFIG } from '@/modules/catalog/products.config';

/**
 * O painel publica no catalogo da Meta, entao a tela mostra o estado da sincronizacao por item —
 * e essa e a unica diferenca em relacao ao padrao do pacote.
 */
export function CatalogPage() {
  return (
    <section className="h-full min-h-0">
      <ProductsProvider api={catalogApi} config={PRODUCTS_CONFIG}>
        <ProductsWorkspace labels={catalogLocale.workspace} />
      </ProductsProvider>
    </section>
  );
}
