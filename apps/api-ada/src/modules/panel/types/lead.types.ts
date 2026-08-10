/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { PanelChannel } from '@/modules/panel/panel.constant';

/**
 * O cliente que o bot capturou, do jeito que a tela de Clientes o mostra.
 *
 * `contact` e o unico campo de contato real que sobe ao navegador em todo o painel, e sobe de
 * proposito: e o dado que o visitante digitou para ser procurado, e uma lista de leads sem ele nao
 * serve para nada. O `whatsappNumber` da sessao continua fora — aquele o bot conhece sem ninguem ter
 * oferecido, e por isso segue mascarado como em toda a `panel.mapper`.
 */
export type PanelLead = {
  readonly conversationId: string;
  readonly name: string | null;
  readonly contact: string | null;
  readonly interest: string | null;
  readonly channel: PanelChannel;
  readonly firstContactAt: string;
  readonly lastActivityAt: string;
  readonly waitingHuman: boolean;
};

export const LEAD_SORT_FIELD = {
  FIRST_CONTACT_AT: 'firstContactAt',
  LAST_ACTIVITY_AT: 'lastActivityAt',
  NAME: 'name',
} as const;

export type LeadSortField = (typeof LEAD_SORT_FIELD)[keyof typeof LEAD_SORT_FIELD];

export type ListLeadsParams = {
  readonly companyId: string;
  readonly page: number;
  readonly limit: number;
  /** Vazio significa "todos": filtro de canal sem selecao nao e filtro. */
  readonly channels: readonly PanelChannel[];
  readonly search?: string;
  readonly sortBy: LeadSortField;
  readonly sortDirection: 'asc' | 'desc';
};

/**
 * Aqui o `total` existe, ao contrario da lista de conversas.
 *
 * A lista de conversas e uma fila que muda enquanto se olha, e paginar por um total defasado esconde
 * conversa; a de leads e um cadastro que so cresce, e a tela precisa do total para dizer em qual
 * pagina de quantas o atendente esta.
 */
export type LeadPage = {
  readonly items: readonly PanelLead[];
  readonly total: number;
  readonly page: number;
  readonly perPage: number;
};

export type PanelLeadRepositoryInterface = {
  list(params: ListLeadsParams): Promise<LeadPage>;
};
