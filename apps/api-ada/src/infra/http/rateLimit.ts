/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { redis } from '@/infra/cache/redisClient';

const KEY_PREFIX = 'ratelimit:';

export type RateLimitRule = {
  readonly limit: number;
  readonly windowSeconds: number;
};

export type RateLimitVerdict =
  | { readonly isAllowed: true }
  | { readonly isAllowed: false; readonly retryAfterSeconds: number };

export type ConsumeRateLimitParams = {
  /** Separa os baldes por rota: estourar o widget nao pode fechar a porta do webhook. */
  readonly bucket: string;
  readonly identity: string;
  readonly rule: RateLimitRule;
};

/**
 * Janela fixa por contador no Redis.
 *
 * `INCR` cria a chave sem TTL, entao o `EXPIRE` do primeiro acesso e o que impede o contador de
 * viver para sempre e barrar o cliente em definitivo.
 */
export async function consumeRateLimit({
  bucket,
  identity,
  rule,
}: ConsumeRateLimitParams): Promise<RateLimitVerdict> {
  const key = `${KEY_PREFIX}${bucket}:${identity}`;
  const hits = await redis.incr(key);

  if (hits === 1) {
    await redis.expire(key, rule.windowSeconds);

    return { isAllowed: true };
  }

  if (hits <= rule.limit) return { isAllowed: true };

  const ttl = await redis.ttl(key);

  return { isAllowed: false, retryAfterSeconds: ttl > 0 ? ttl : rule.windowSeconds };
}
