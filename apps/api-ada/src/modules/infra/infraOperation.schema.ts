/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { z } from 'zod';

export const infraServiceResultsSchema = z.array(
  z.object({
    serviceName: z.string(),
    outcome: z.enum(['ok', 'failed', 'skipped']),
    errorCode: z.string().optional(),
  }),
);
