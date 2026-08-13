/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, test } from 'bun:test';

import { extractReviewVerdicts } from '@/modules/channel/meta/metaCatalogEvent';

function eventWith(value: Record<string, unknown>, field = 'product_catalogs'): string {
  return JSON.stringify({ entry: [{ changes: [{ field, value }] }] });
}

describe('extractReviewVerdicts', () => {
  test('aprovacao traz o id do item da Meta, que vira o externalId do produto', () => {
    const body = eventWith({
      retailer_id: 'produto-1',
      product_item_id: 'meta-item-9',
      review_status: 'approved',
    });

    expect(extractReviewVerdicts(body)).toEqual([
      { retailerId: 'produto-1', approved: true, externalId: 'meta-item-9' },
    ]);
  });

  test('reprovacao junta os motivos numa razao so, para o operador ler no painel', () => {
    const body = eventWith({
      retailer_id: 'produto-1',
      review_status: 'rejected',
      rejection_reasons: ['image_quality', 'missing_description'],
    });

    expect(extractReviewVerdicts(body)).toEqual([
      { retailerId: 'produto-1', approved: false, reason: 'image_quality; missing_description' },
    ]);
  });

  test('item ainda em revisao nao e veredito, e nao acende alarme de falha', () => {
    expect(extractReviewVerdicts(eventWith({ retailer_id: 'produto-1', review_status: 'pending' }))).toEqual([]);
  });

  test('campo que nao e de catalogo e ignorado', () => {
    const body = eventWith({ retailer_id: 'produto-1', review_status: 'approved' }, 'messages');

    expect(extractReviewVerdicts(body)).toEqual([]);
  });

  test('campo novo no payload nao derruba a leitura do que interessa', () => {
    const body = eventWith({
      retailer_id: 'produto-1',
      review_status: 'APPROVED',
      campo_que_a_meta_inventou: { qualquer: 'coisa' },
    });

    expect(extractReviewVerdicts(body)).toHaveLength(1);
  });

  test('corpo que nao e JSON devolve lista vazia, em vez de derrubar a rota', () => {
    expect(extractReviewVerdicts('nao e json')).toEqual([]);
  });

  test('evento sem `retailer_id` nao tem a quem apontar', () => {
    expect(extractReviewVerdicts(eventWith({ review_status: 'rejected' }))).toEqual([]);
  });
});
