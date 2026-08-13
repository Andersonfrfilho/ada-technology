/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

const CATALOG_BASE_PATH = '/v1/panel/catalog';

export const CATALOG_PATH = {
  PRODUCTS: `${CATALOG_BASE_PATH}/products`,
  BULK_IMPORT: `${CATALOG_BASE_PATH}/products/bulk-import`,
  CATALOGS: `${CATALOG_BASE_PATH}/catalogs`,
} as const;

export const CATALOG_ROWS_PER_PAGE = 20;

/**
 * Cabecalho da planilha -> campo do modulo, ja normalizado (sem acento, minusculo).
 *
 * O operador exporta do Excel em portugues; aceitar tambem o nome do campo evita que quem gera o
 * arquivo por script precise traduzir a coluna.
 */
export const CSV_COLUMN_BY_HEADER: Readonly<Record<string, string | undefined>> = {
  nome: 'name',
  name: 'name',
  preco: 'price',
  price: 'price',
  descricao: 'description',
  description: 'description',
  unidade: 'unit',
  unit: 'unit',
  'codigo de barras': 'barcode',
  barcode: 'barcode',
  catalogo: 'catalogName',
  catalogname: 'catalogName',
  secao: 'sectionName',
  sectionname: 'sectionName',
  estoque: 'inventory',
  inventory: 'inventory',
};

/**
 * A area do catalogo na URL, em portugues.
 *
 * O id da area e do pacote e nao muda; o que o atendente cola no chat do time e este termo, e ele
 * segue a convencao das outras telas do painel.
 */
export const CATALOG_AREA_URL_KEY = 'aba';

export const CATALOG_AREA_URL_VALUE = {
  PRODUCTS: 'produtos',
  CATALOGS: 'catalogos',
} as const;
