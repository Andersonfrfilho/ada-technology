/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { PRODUCT_OPTIONAL_FIELD, type ProductsConfig } from '@adatechnology/products-ui';

import { IMAGE_CUTOUT } from '@/modules/shared/imageCutout.constant';

/**
 * Declarado fora do componente: o `ProductsProvider` memoriza pelo objeto, e um literal remontado a
 * cada render trocaria o contexto inteiro a cada tecla digitada na busca.
 *
 * Sem tempo de preparo nem instrucao de producao — sao campos de restaurante, e o painel da Ada
 * vende servico e produto avulso. Estado da sincronizacao fica ligado porque a API publica no
 * catalogo da Meta; instalacao sem `META_CATALOG_*` devolve `syncStatus: null`, e a coluna aparece
 * vazia em vez de sugerir pendencia.
 */
export const PRODUCTS_CONFIG: Partial<ProductsConfig> = {
  currency: 'BRL',
  locale: 'pt-BR',
  fields: [
    PRODUCT_OPTIONAL_FIELD.COST_PRICE,
    PRODUCT_OPTIONAL_FIELD.UNIT,
    PRODUCT_OPTIONAL_FIELD.BARCODE,
    PRODUCT_OPTIONAL_FIELD.INVENTORY,
  ],
  metaSync: { products: true, catalogs: true },
  backgroundRemoval: IMAGE_CUTOUT,
};
