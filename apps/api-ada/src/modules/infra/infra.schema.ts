/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { z } from 'zod';

export const infraEnvironmentParamsSchema = z.object({ environmentId: z.string().uuid() });

export const infraOperationParamsSchema = z.object({ operationId: z.string().uuid() });
