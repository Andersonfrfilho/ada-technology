/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { CatalogProductLookup, Product } from '@adatechnology/catalog-contracts';
import type { CatalogPort, CatalogProduct } from '@adatechnology/meta-whatsapp-contracts';

import { CATALOG_CURRENCY } from '@/modules/catalog/catalog.constant';

type CreateCatalogChannelPortParams = {
  /**
   * Resolvido na chamada, e nao na montagem: o modulo de WhatsApp nasce antes do de catalogo no
   * container, e as duas pontas so se encontram quando chega mensagem — muito depois do boot.
   */
  readonly resolveLookup: () => CatalogProductLookup;
  readonly companyId: string;
};

/**
 * Ponte entre o catalogo (nosso banco) e o canal de conversa (o que a Meta enxerga).
 *
 * O `retailerId` que sai daqui e o id do nosso produto: e ele que a publicacao envia para a Meta,
 * e e por ele que o veredito da revisao volta. Sem tabela de correspondencia no meio.
 *
 * `catalogId` chega no contrato do canal porque o `retailerId` so significa alguma coisa dentro de
 * um catalogo da Meta, mas a consulta e por empresa: a conta tem um catalogo publicado, e o id
 * dele ja foi usado na hora de publicar o item.
 */
export function createCatalogChannelPort(params: CreateCatalogChannelPortParams): CatalogPort {
  return {
    async listProducts({ search }): Promise<CatalogProduct[]> {
      const products = await params.resolveLookup().listForChannel({
        companyId: params.companyId,
        ...(search ? { search } : {}),
      });

      return products.map(toChannelProduct);
    },

    async findProductByRetailerId(retailerId): Promise<CatalogProduct | undefined> {
      const product = await params.resolveLookup().findByRetailerId({ companyId: params.companyId, retailerId });

      return product ? toChannelProduct(product) : undefined;
    },

    async consumeInventory({ retailerId, quantity }): Promise<void> {
      await params.resolveLookup().consumeInventory({
        companyId: params.companyId,
        productId: retailerId,
        quantity,
      });
    },
  };
}

function toChannelProduct(product: Product): CatalogProduct {
  return {
    retailerId: product.id,
    name: product.name,
    priceInCents: product.priceInCents,
    currency: CATALOG_CURRENCY,
    availability: product.availability,
    ...(product.imageUrl ? { imageUrl: product.imageUrl } : {}),
  };
}
