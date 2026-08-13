/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { MetaCatalogSyncPort, MetaProductPayload, MetaSyncOutcome } from '@adatechnology/catalog-contracts';
import { MetaGraphError } from '@adatechnology/meta-graph-core';
import type { MetaCatalogProvider } from '@adatechnology/meta-catalog-provider';

import { RETRIABLE_GRAPH_ERROR_CODES } from '@/modules/catalog/catalog.constant';

/**
 * Traduz o cliente da Graph API no contrato que o `catalog-module` espera.
 *
 * O modulo nao importa o provider de proposito: quem so gerencia catalogo interno nao carrega
 * cliente de Graph API. A ponte e do host, e e aqui que a excecao da Meta vira decisao — repetir
 * ou desistir — em vez de subir e derrubar a publicacao inteira do lote.
 */
export class MetaCatalogSyncAdapter implements MetaCatalogSyncPort {
  constructor(private readonly provider: MetaCatalogProvider) {}

  async upsertProduct(payload: MetaProductPayload): Promise<MetaSyncOutcome> {
    return this.attempt(async () => {
      // `retailerId` e a chave do nosso lado; a Meta faz upsert por ele dentro do catalogo, entao
      // criar de novo um item ja publicado atualiza em vez de duplicar.
      const result = await this.provider.createProduct({
        retailerId: payload.retailerId,
        name: payload.name,
        description: payload.description,
        priceInCents: payload.priceInCents,
        currency: payload.currency,
        imageUrl: payload.imageUrl ?? '',
        categoryLabel: '',
        availability: payload.availability,
      });

      return { outcome: 'synced', externalId: result.id } as const;
    });
  }

  async deleteProduct(externalId: string): Promise<void> {
    await this.provider.deleteProduct(externalId);
  }

  async upsertProductSet(params: { readonly name: string; readonly externalId?: string }): Promise<MetaSyncOutcome> {
    return this.attempt(async () => {
      const result = params.externalId
        ? await this.provider.updateProductSet({ productSetId: params.externalId, name: params.name })
        : await this.provider.createProductSet({ name: params.name, categoryLabel: params.name });

      return { outcome: 'synced', externalId: result.id } as const;
    });
  }

  async deleteProductSet(externalId: string): Promise<void> {
    await this.provider.deleteProductSet(externalId);
  }

  /**
   * Catch local legitimo: a recusa da Meta e resultado esperado desta operacao, nao falha do
   * processo. O use case grava `failed` ou reagenda a partir do que sai daqui — deixar propagar
   * abortaria a varredura no primeiro item recusado (`code-standart.md` §7).
   */
  private async attempt(run: () => Promise<MetaSyncOutcome>): Promise<MetaSyncOutcome> {
    try {
      return await run();
    } catch (error) {
      if (!(error instanceof MetaGraphError)) throw error;

      return {
        outcome: RETRIABLE_GRAPH_ERROR_CODES.includes(error.code) ? 'retriable' : 'permanent',
        errorCode: error.code,
        message: error.providerMessage,
      };
    }
  }
}
