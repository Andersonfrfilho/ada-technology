/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { z } from 'zod';

import { WIDGET_MESSAGE_MAX_LENGTH, WIDGET_TRANSCRIPT_MAX_LIMIT } from '@/modules/channel/widget/widget.constant';

export const widgetMessageSchema = z.object({
  text: z.string().trim().min(1).max(WIDGET_MESSAGE_MAX_LENGTH),
});

export const widgetTranscriptQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(WIDGET_TRANSCRIPT_MAX_LIMIT).optional(),
  /** `createdAt` da mensagem mais antiga ja carregada: pagina para tras sem repetir o que a tela tem. */
  before: z.string().datetime().optional(),
});
