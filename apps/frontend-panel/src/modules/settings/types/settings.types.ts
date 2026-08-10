/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { FormEvent } from 'react';

import type {
  TemplateSettings,
  WhatsAppCreateTemplateResult,
  WhatsAppCreateTemplateState,
  WhatsAppTemplateSummary,
} from '@adatechnology/conversations-ui';

/** O que a API devolve ao criar um template: a Meta responde com o id curto e o status da revisao. */
export type CreatedTemplate = {
  readonly shortId: string;
  readonly status: string;
};

/**
 * `WhatsAppTemplatesSettings` e presentacional: recebe estado e handlers prontos.
 *
 * Este e o contrato entre o hook que fala com a API e a tela composta do pacote — mutavel nos
 * arrays porque e assim que o pacote os declara.
 */
export type TemplateSettingsState = {
  readonly templates: WhatsAppTemplateSummary[];
  readonly loadingTemplates: boolean;
  readonly templatesError: boolean;
  readonly refreshTemplates: () => void;
  readonly settings: TemplateSettings;
  readonly selectTemplate: (name: string, template: WhatsAppTemplateSummary | undefined) => void;
  readonly changeVariables: (variables: string[]) => void;
  readonly saving: boolean;
  readonly saveSuccess: boolean;
  readonly save: (event: FormEvent) => void;
  readonly draft: WhatsAppCreateTemplateState;
  readonly changeDraft: (draft: WhatsAppCreateTemplateState) => void;
  readonly submitDraft: (event: FormEvent) => void;
  readonly submitting: boolean;
  readonly submitResult: WhatsAppCreateTemplateResult | null;
};
