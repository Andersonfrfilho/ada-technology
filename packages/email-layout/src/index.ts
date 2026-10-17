/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export { buildEmailHtml } from './emailLayout.factory';
export { validateEmailHtml } from './emailLayout.validator';
export { EMAIL_COMPANY, EMAIL_LOGO_HEIGHT, EMAIL_MAX_WIDTH, EMAIL_PALETTE } from './emailLayout.constant';
export { EMAIL_GMAIL_CLIP_BYTES, EMAIL_HTML_PROBLEM } from './emailValidation.constant';
export type {
  BuildEmailHtmlParams,
  EmailAction,
  EmailRecipientCard,
} from './types/emailLayout.types';
export type {
  EmailHtmlProblem,
  EmailHtmlSeverity,
  ValidateEmailHtmlResult,
} from './types/emailValidation.types';
