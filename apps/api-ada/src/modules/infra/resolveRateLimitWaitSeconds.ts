/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import {
  RAILWAY_RATE_LIMIT_DEFAULT_WAIT_SECONDS,
  RAILWAY_RATE_LIMIT_MAX_WAIT_SECONDS,
} from '@/modules/infra/infra.constant';
import type {
  ResolveRateLimitWaitSecondsParams,
  ResolveRateLimitWaitSecondsResult,
} from '@/modules/infra/types/infra.types';

const MILLISECONDS_PER_SECOND = 1000;
// Acima disso o valor so pode ser um instante absoluto (epoch em segundos), nunca uma duracao.
const EPOCH_SECONDS_THRESHOLD = 1_000_000_000;

function parseRetryAfter(value: string, nowMilliseconds: number): number | undefined {
  const numeric = Number(value);
  if (value.trim() !== '' && Number.isFinite(numeric)) return numeric;

  const dateMilliseconds = Date.parse(value);
  if (Number.isNaN(dateMilliseconds)) return undefined;
  return (dateMilliseconds - nowMilliseconds) / MILLISECONDS_PER_SECOND;
}

function parseRateLimitReset(value: string, nowMilliseconds: number): number | undefined {
  const numeric = Number(value);
  if (value.trim() !== '' && Number.isFinite(numeric)) {
    return numeric >= EPOCH_SECONDS_THRESHOLD ? numeric - nowMilliseconds / MILLISECONDS_PER_SECOND : numeric;
  }
  return parseRetryAfter(value, nowMilliseconds);
}

/** Header ausente, ilegivel ou absurdo nunca trava a API: cai no padrao ou no teto. */
export function resolveRateLimitWaitSeconds(params: ResolveRateLimitWaitSecondsParams): ResolveRateLimitWaitSecondsResult {
  const { headers, nowMilliseconds } = params;
  const retryAfter = headers.get('Retry-After');
  const reset = headers.get('X-RateLimit-Reset');
  const parsed =
    (retryAfter !== null ? parseRetryAfter(retryAfter, nowMilliseconds) : undefined) ??
    (reset !== null ? parseRateLimitReset(reset, nowMilliseconds) : undefined);

  if (parsed === undefined) return { seconds: RAILWAY_RATE_LIMIT_DEFAULT_WAIT_SECONDS };
  return { seconds: Math.min(RAILWAY_RATE_LIMIT_MAX_WAIT_SECONDS, Math.max(1, Math.ceil(parsed))) };
}
