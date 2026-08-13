/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type {
  BulkImportResult,
  Catalog,
  CreateCatalogInput,
  CreateProductInput,
  PaginatedResponse,
  Product,
  ProductsApi,
  UpdateCatalogInput,
  UpdateProductInput,
} from '@adatechnology/products-ui';

import { CATALOG_PATH, CATALOG_ROWS_PER_PAGE } from '@/modules/catalog/catalog.constant';
import { parseCatalogCsv } from '@/modules/catalog/catalogCsv';
import { HTTP_METHOD } from '@/modules/shared/http/http.constant';
import { panelListRequest, panelRequest } from '@/modules/shared/http/panelHttpClient';

/**
 * A paginacao do modulo de catalogo traz `pageSize` e `totalPages`, e nao o `perPage` das rotas
 * proprias do painel. O envelope e o mesmo; o que muda sao os campos, e a tela precisa dos dois
 * ultimos para saber se existe pagina seguinte.
 */
type CatalogPagination = {
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
};

async function listPaginated<TItem>(
  path: string,
  query: Readonly<Record<string, string | number | boolean | undefined>>,
): Promise<PaginatedResponse<TItem>> {
  const { items, pagination } = await panelListRequest<TItem>({ path, query });
  const { total, page, pageSize, totalPages } = pagination as unknown as CatalogPagination;

  return { data: items, total, page, pageSize, totalPages };
}

function productPath(id: string): string {
  return `${CATALOG_PATH.PRODUCTS}/${encodeURIComponent(id)}`;
}

function catalogPath(id: string): string {
  return `${CATALOG_PATH.CATALOGS}/${encodeURIComponent(id)}`;
}

/** A ponte entre a tela do pacote e as rotas do modulo de catalogo sob `/v1/panel/catalog`. */
export const catalogApi: ProductsApi = {
  listProducts: (params) =>
    listPaginated<Product>(CATALOG_PATH.PRODUCTS, {
      page: params?.page ?? 1,
      pageSize: CATALOG_ROWS_PER_PAGE,
      search: params?.search,
      catalogId: params?.catalogId,
      active: params?.active,
    }),

  getProduct: (id) => panelRequest<Product>({ path: productPath(id) }),

  createProduct: (data: CreateProductInput) =>
    panelRequest<Product>({ path: CATALOG_PATH.PRODUCTS, method: HTTP_METHOD.POST, body: data }),

  updateProduct: (id, data: UpdateProductInput) =>
    panelRequest<Product>({ path: productPath(id), method: HTTP_METHOD.PUT, body: data }),

  deleteProduct: async (id) => {
    await panelRequest<void>({ path: productPath(id), method: HTTP_METHOD.DELETE });
  },

  listCatalogs: (params) =>
    listPaginated<Catalog>(CATALOG_PATH.CATALOGS, {
      page: params?.page ?? 1,
      pageSize: CATALOG_ROWS_PER_PAGE,
      search: params?.search,
    }),

  getCatalog: (id) => panelRequest<Catalog>({ path: catalogPath(id) }),

  createCatalog: (data: CreateCatalogInput) =>
    panelRequest<Catalog>({ path: CATALOG_PATH.CATALOGS, method: HTTP_METHOD.POST, body: data }),

  updateCatalog: (id, data: UpdateCatalogInput) =>
    panelRequest<Catalog>({ path: catalogPath(id), method: HTTP_METHOD.PUT, body: data }),

  deleteCatalog: async (id) => {
    await panelRequest<void>({ path: catalogPath(id), method: HTTP_METHOD.DELETE });
  },

  /**
   * O modulo recebe linhas ja extraidas da planilha, e nao o arquivo: quem le CSV e o navegador,
   * que tem o texto em maos, e mandar o arquivo obrigaria a API a carregar um parser so para isso.
   */
  bulkImportProducts: async (file: File) =>
    panelRequest<BulkImportResult>({
      path: CATALOG_PATH.BULK_IMPORT,
      method: HTTP_METHOD.POST,
      body: { rows: parseCatalogCsv(await file.text()) },
    }),

  /**
   * O arquivo vai cru, com o proprio `Content-Type` — sem `multipart`.
   *
   * A rota recebe uma imagem so, e o `multipart` custaria um parser de fronteira na API para
   * carregar exatamente o mesmo byte. Quem decide se o formato serve e o servidor: o tipo declarado
   * pelo navegador vem do cliente, e o modulo o valida contra a lista fechada dele.
   */
  uploadImage: (file: File) =>
    panelRequest<{ readonly url: string; readonly key: string }>({
      path: CATALOG_PATH.PRODUCT_IMAGES,
      method: HTTP_METHOD.POST,
      binary: { blob: file, contentType: file.type },
    }),
};
