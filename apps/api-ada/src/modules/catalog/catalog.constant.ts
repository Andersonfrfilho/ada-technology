/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/** Prefixo das rotas do modulo. O painel e o unico consumidor, e por isso vive sob `/v1/panel`. */
export const CATALOG_BASE_PATH = '/v1/panel/catalog';

export const CATALOG_CURRENCY = 'BRL';
export const CATALOG_LOCALE = 'pt_BR';

/**
 * Codigos da Graph API que valem nova tentativa.
 *
 * Todo o resto e recusa de conteudo — payload invalido, item duplicado, permissao faltando — e
 * repetir so gastaria chamada. `4` e `80004` sao teto de requisicao, `2` e `1` sao falha interna
 * da Meta, e `368` e bloqueio temporario da conta. Timeout e falha de rede entram porque nao houve
 * resposta nenhuma: nao se sabe sequer se a Meta recebeu, e desistir perderia o item em silencio.
 */
export const RETRIABLE_GRAPH_ERROR_CODES: readonly string[] = [
  '1',
  '2',
  '4',
  '368',
  '80004',
  'WHATSAPP_TIMEOUT',
  'WHATSAPP_NETWORK_ERROR',
];

/** Escopo do modulo esperado por `dispatchRoute` nas rotas de catalogo. */
export const CATALOG_ADMIN_SCOPE = 'admin';

/**
 * Teto do objeto no provider de storage, alinhado ao teto do `catalog-module`.
 *
 * O modulo ja recusa acima disso; aqui e a segunda barreira, do lado do bucket, para um caminho
 * futuro que nao passe pelo use case nao conseguir subir um objeto de gigabyte.
 */
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Onde a imagem do produto e servida, e sob que prefixo ela vive no bucket.
 *
 * O prefixo espelha o que o `catalog-module` monta na chave: os dois precisam concordar, e
 * declarar duas vezes os separaria. A rota e publica porque quem busca a imagem e a Meta, sem
 * token nenhum — fica fora de `/v1/panel` de proposito.
 */
export const PRODUCT_IMAGE = {
  PUBLIC_PATH: '/v1/catalog/images',
  KEY_PREFIX: 'products',
} as const;

/** Config e rotas precisam concordar sobre o que e publicado; declarar duas vezes as separaria. */
export const CATALOG_META_SYNC = { products: true, catalogs: true } as const;
