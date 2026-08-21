/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { LeadSortField } from '@/modules/leads/leads.constant';

/** Espelha o `PanelLead` da API; o contrato mora la, e aqui so o que a tela le. */
export type Lead = {
  readonly conversationId: string;
  readonly name: string | null;
  readonly contact: string | null;
  readonly email: string | null;
  readonly interest: string | null;
  readonly channel: string;
  readonly firstContactAt: string;
  readonly lastActivityAt: string;
  readonly waitingHuman: boolean;
};

export type FetchLeadsParams = {
  readonly page: number;
  readonly perPage: number;
  readonly channels: readonly string[];
  readonly search: string;
  readonly sortBy: LeadSortField;
  readonly sortDirection: 'asc' | 'desc';
};
