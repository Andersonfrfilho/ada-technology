/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, test } from 'bun:test';

import type { MetaProductPayload } from '@adatechnology/catalog-contracts';
import { WhatsAppConnectionError, WhatsAppRejectionError } from '@adatechnology/meta-graph-core';
import type { MetaCatalogProvider } from '@adatechnology/meta-catalog-provider';

import { MetaCatalogSyncAdapter } from '@/modules/catalog/MetaCatalogSyncAdapter';

const payload: MetaProductPayload = {
  retailerId: 'produto-1',
  name: 'Consultoria',
  description: 'Uma hora de consultoria',
  priceInCents: 25_000,
  currency: 'BRL',
  availability: 'in stock',
};

function adapterThatFailsWith(error: unknown): MetaCatalogSyncAdapter {
  const provider = {
    createProduct: async () => {
      throw error;
    },
  } as unknown as MetaCatalogProvider;

  return new MetaCatalogSyncAdapter(provider);
}

describe('MetaCatalogSyncAdapter', () => {
  test('devolve o id externo quando a Meta aceita', async () => {
    const provider = { createProduct: async () => ({ id: 'meta-1' }) } as unknown as MetaCatalogProvider;

    expect(await new MetaCatalogSyncAdapter(provider).upsertProduct(payload)).toEqual({
      outcome: 'synced',
      externalId: 'meta-1',
    });
  });

  test('trata teto de requisicao como nova tentativa', async () => {
    const adapter = adapterThatFailsWith(new WhatsAppRejectionError('4', 'limite atingido', null));

    expect(await adapter.upsertProduct(payload)).toEqual({
      outcome: 'retriable',
      errorCode: '4',
      message: 'limite atingido',
    });
  });

  test('trata falha de rede como nova tentativa: nao se sabe se a Meta recebeu', async () => {
    const adapter = adapterThatFailsWith(new WhatsAppConnectionError('socket fechado'));

    expect((await adapter.upsertProduct(payload)).outcome).toBe('retriable');
  });

  test('trata recusa de conteudo como definitiva', async () => {
    const adapter = adapterThatFailsWith(new WhatsAppRejectionError('100', 'preco invalido', null));

    expect(await adapter.upsertProduct(payload)).toEqual({
      outcome: 'permanent',
      errorCode: '100',
      message: 'preco invalido',
    });
  });

  test('deixa passar o que nao vem da Graph API, para nao virar item marcado como recusado', async () => {
    const adapter = adapterThatFailsWith(new TypeError('bug nosso'));

    await expect(adapter.upsertProduct(payload)).rejects.toThrow('bug nosso');
  });
});
