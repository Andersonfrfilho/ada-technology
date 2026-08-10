/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { CreateTemplateInput, CreateWhatsAppTemplateResult } from '@/modules/settings/types/settings.types';

export type TemplateSummary = {
  readonly id: string;
  readonly name: string;
  readonly shortId: string;
  readonly displayName: string;
  readonly status: string;
  readonly category: string;
  readonly language: string;
  readonly bodyText: string | null;
  readonly variableCount: number;
};

/** O catalogo de templates aprovados. Quem implementa fala com a Meta; quem consome nao sabe disso. */
export interface TemplateCatalog {
  list(): Promise<readonly TemplateSummary[]>;
  create(input: CreateTemplateInput): Promise<CreateWhatsAppTemplateResult>;
}
