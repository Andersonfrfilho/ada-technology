/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export const LEADS_PATH = '/v1/panel/leads';

export const LEADS_QUERY_KEY = 'panel-leads';

/** Os mesmos nomes que a rota aceita: divergir aqui vira 400 na primeira ordenacao. */
export const LEAD_SORT_FIELD = {
  FIRST_CONTACT_AT: 'firstContactAt',
  LAST_ACTIVITY_AT: 'lastActivityAt',
  NAME: 'name',
} as const;

export type LeadSortField = (typeof LEAD_SORT_FIELD)[keyof typeof LEAD_SORT_FIELD];

export const LEAD_CHANNEL = {
  WEBCHAT: 'webchat',
  WHATSAPP: 'whatsapp',
} as const;

export const LEADS_DEFAULT_PER_PAGE = 20;
export const LEADS_PER_PAGE_OPTIONS: readonly number[] = [20, 50, 100];

/** As chaves da query string; sao o que o atendente cola no chat para mostrar a mesma lista. */
export const LEADS_URL_KEY = {
  SEARCH: 'busca',
  CHANNEL: 'canal',
  SORT_BY: 'ordem',
  SORT_DIRECTION: 'direcao',
  PAGE: 'pagina',
  PER_PAGE: 'porPagina',
} as const;

const SORT_FIELDS: readonly string[] = Object.values(LEAD_SORT_FIELD);

export function isLeadSortField(value: string): value is LeadSortField {
  return SORT_FIELDS.includes(value);
}
