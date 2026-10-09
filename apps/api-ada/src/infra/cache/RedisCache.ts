/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { CacheInterface } from '@adatechnology/meta-whatsapp-contracts';

import type { InfraCacheInterface } from '@/modules/infra/types/infraCache.interface';
import type { SetIfAbsentParams } from '@/modules/infra/types/infra.types';
import { redis } from '@/infra/cache/redisClient';

export class RedisCache implements CacheInterface, InfraCacheInterface {
  async get(key: string): Promise<string | null> {
    return redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds === undefined) {
      await redis.set(key, value);
      return;
    }

    await redis.set(key, value, 'EX', ttlSeconds);
  }

  async setIfAbsent(params: SetIfAbsentParams): Promise<boolean> {
    const reply = await redis.set(params.key, params.value, 'EX', params.ttlSeconds, 'NX');
    return reply === 'OK';
  }

  async delete(key: string): Promise<void> {
    await redis.del(key);
  }
}
