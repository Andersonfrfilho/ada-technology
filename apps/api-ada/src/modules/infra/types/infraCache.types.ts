/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { z } from 'zod';

export type ParseCachedJsonParams<TData> = {
  readonly raw: string;
  readonly schema: z.ZodType<TData>;
};

export type SetIfAbsentParams = {
  readonly key: string;
  readonly value: string;
  readonly ttlSeconds: number;
};

export type RenewIfOwnerParams = {
  readonly key: string;
  readonly owner: string;
  readonly ttlSeconds: number;
};

export type ReleaseIfOwnerParams = { readonly key: string; readonly owner: string };
