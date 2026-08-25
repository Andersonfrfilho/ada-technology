/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/** Acima disto o Gmail corta a mensagem e esconde o fim atras de "ver mensagem inteira". */
export const EMAIL_GMAIL_CLIP_BYTES = 102_400;

export const EMAIL_HTML_PROBLEM = {
  SCRIPT: 'EMAIL_HTML_SCRIPT',
  EXTERNAL_STYLESHEET: 'EMAIL_HTML_EXTERNAL_STYLESHEET',
  DATA_URI_IMAGE: 'EMAIL_HTML_DATA_URI_IMAGE',
  IMAGE_WITHOUT_ALT: 'EMAIL_HTML_IMAGE_WITHOUT_ALT',
  RELATIVE_URL: 'EMAIL_HTML_RELATIVE_URL',
  MODERN_LAYOUT: 'EMAIL_HTML_MODERN_LAYOUT',
  GMAIL_CLIP: 'EMAIL_HTML_GMAIL_CLIP',
  MISSING_TITLE: 'EMAIL_HTML_MISSING_TITLE',
  UNBALANCED_TAGS: 'EMAIL_HTML_UNBALANCED_TAGS',
} as const;
