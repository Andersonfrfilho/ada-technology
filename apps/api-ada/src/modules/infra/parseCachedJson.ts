/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { z } from 'zod';

import type { ParseCachedJsonParams } from '@/modules/infra/types/infraCache.types';

/** Cache e entrada nao confiavel: JSON quebrado ou de forma antiga e miss, nunca excecao. */
export function parseCachedJson<TData>(params: ParseCachedJsonParams<TData>): TData | undefined {
  let value: unknown;
  try {
    value = JSON.parse(params.raw);
  } catch {
    return undefined;
  }
  const parsed = params.schema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
