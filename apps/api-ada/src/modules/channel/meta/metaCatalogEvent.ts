/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { z } from 'zod';

import { CATALOG_REVIEW_STATUS, CATALOG_WEBHOOK_FIELD } from '@/modules/channel/meta/metaCatalog.constant';

export type CatalogReviewVerdict = {
  readonly retailerId: string;
  readonly approved: boolean;
  readonly externalId?: string;
  readonly reason?: string;
};

/**
 * Schema deliberadamente frouxo nas bordas e estrito no que e usado.
 *
 * O payload da Meta e entrada nao confiavel e cresce sem aviso: campo novo nao pode derrubar a
 * rota. O que interessa e o par `retailer_id` + `review_status`; o resto passa e e ignorado.
 */
const changeSchema = z.object({
  field: z.string(),
  value: z
    .object({
      retailer_id: z.string().min(1).optional(),
      product_item_id: z.string().min(1).optional(),
      review_status: z.string().optional(),
      rejection_reasons: z.array(z.string()).optional(),
    })
    .passthrough(),
});

const payloadSchema = z.object({
  entry: z
    .array(
      z.object({
        changes: z.array(changeSchema).optional(),
      }),
    )
    .optional(),
});

/**
 * Extrai os vereditos de revisao de um evento de catalogo.
 *
 * Corpo que nao case com o formato devolve lista vazia em vez de erro: a Meta reentrega por dias o
 * que nao recebe 200, e recusar um evento que so tem campo desconhecido criaria fila de
 * retentativa sem nada para consumir.
 */
export function extractReviewVerdicts(rawBody: string): readonly CatalogReviewVerdict[] {
  const parsed = payloadSchema.safeParse(safeJsonParse(rawBody));
  if (!parsed.success) return [];

  return (parsed.data.entry ?? []).flatMap((entry) =>
    (entry.changes ?? [])
      .filter((change) => change.field === CATALOG_WEBHOOK_FIELD.PRODUCT_CATALOGS)
      .flatMap((change) => toVerdict(change.value) ?? []),
  );
}

function toVerdict(value: z.infer<typeof changeSchema>['value']): CatalogReviewVerdict | undefined {
  const status = value.review_status?.toLowerCase();
  if (!value.retailer_id || !status) return undefined;

  const approved = status === CATALOG_REVIEW_STATUS.APPROVED;

  // `pending`/`outdated` nao sao veredito: o item ainda esta em fila de revisao, e marcar `failed`
  // ali acenderia alarme para quem so precisa esperar.
  if (!approved && status !== CATALOG_REVIEW_STATUS.REJECTED) return undefined;

  const reason = value.rejection_reasons?.join('; ');

  return {
    retailerId: value.retailer_id,
    approved,
    ...(value.product_item_id ? { externalId: value.product_item_id } : {}),
    ...(reason ? { reason } : {}),
  };
}

function safeJsonParse(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody);
  } catch {
    return undefined;
  }
}
