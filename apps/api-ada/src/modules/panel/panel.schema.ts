/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { z } from 'zod';

import {
  isPanelChannel,
  PANEL_CONVERSATION_MAX_LIMIT,
  PANEL_DOCUMENTS_MAX_LIMIT,
  PANEL_LEADS_MAX_LIMIT,
  PANEL_MESSAGE_MAX_LENGTH,
  PANEL_TRANSCRIPT_MAX_LIMIT,
} from '@/modules/panel/panel.constant';
import { LEAD_SORT_FIELD } from '@/modules/panel/types/lead.types';

/**
 * O id vai comparado com uma coluna `uuid`.
 *
 * Sem esta validacao um caminho qualquer chegaria ao Postgres e viraria `invalid input syntax for
 * type uuid` — um 500 no lugar do 404, e ruido de erro interno para quem so digitou uma URL errada.
 */
export const conversationIdSchema = z.string().uuid();

export const panelConversationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(PANEL_CONVERSATION_MAX_LIMIT).optional(),
  waitingHuman: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  search: z.string().trim().min(1).optional(),
});

export const panelMessageSchema = z.object({
  text: z.string().trim().min(1).max(PANEL_MESSAGE_MAX_LENGTH),
});

export const panelTranscriptQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(PANEL_TRANSCRIPT_MAX_LIMIT).optional(),
  before: z.string().datetime().optional(),
});

export const panelDocumentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(PANEL_DOCUMENTS_MAX_LIMIT).optional(),
  search: z.string().trim().min(1).optional(),
  /** Lista separada por virgula, como o filtro de selecao multipla manda. */
  source: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.split(',').filter((item) => item.length > 0))
    .optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
});

/**
 * O `channel` chega como lista separada por virgula, do jeito que o filtro de selecao multipla manda.
 *
 * Valor fora do vocabulario e descartado em vez de reprovar a requisicao: filtro e navegacao, e URL
 * colada com um canal que nao existe mais deve mostrar a lista, nao um erro de validacao.
 */
export const panelLeadsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(PANEL_LEADS_MAX_LIMIT).optional(),
  search: z.string().trim().min(1).optional(),
  channel: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.split(',').filter(isPanelChannel))
    .optional(),
  sortBy: z
    .enum([LEAD_SORT_FIELD.FIRST_CONTACT_AT, LEAD_SORT_FIELD.LAST_ACTIVITY_AT, LEAD_SORT_FIELD.NAME])
    .optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
});

/** Sem conversa o bilhete vale para o stream global; com ela, so para aquela conversa. */
export const realtimeTicketSchema = z.object({
  conversationId: conversationIdSchema.optional(),
});

export const realtimeTicketQuerySchema = z.object({
  ticket: z.string().min(1),
});
