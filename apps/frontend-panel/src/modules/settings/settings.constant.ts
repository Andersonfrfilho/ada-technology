/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { TemplateSettings, WhatsAppCreateTemplateState } from '@adatechnology/conversations-ui';

export const DEFAULT_TEMPLATE_LANGUAGE = 'pt_BR';

export const EMPTY_TEMPLATE_SETTINGS: TemplateSettings = {
  templateName: '',
  templateLanguage: DEFAULT_TEMPLATE_LANGUAGE,
  variables: [],
};

export const EMPTY_TEMPLATE_DRAFT: WhatsAppCreateTemplateState = {
  name: '',
  category: 'UTILITY',
  language: DEFAULT_TEMPLATE_LANGUAGE,
  headerType: 'NONE',
  headerText: '',
  bodyText: '',
  footerText: '',
};

/** Quanto tempo o "salvo" fica visivel antes de sumir sozinho. */
export const SAVE_FEEDBACK_MS = 3000;
