/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { CacheInterface } from '@adatechnology/meta-whatsapp-contracts';

import type { InfraCacheInterface } from '@/modules/infra/types/infraCache.interface';
import type { ReleaseIfOwnerParams, RenewIfOwnerParams, SetIfAbsentParams } from '@/modules/infra/types/infra.types';
import { redis } from '@/infra/cache/redisClient';

const RENEW_IF_OWNER_SCRIPT =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('expire', KEYS[1], ARGV[2]) end return 0";
const RELEASE_IF_OWNER_SCRIPT =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0";

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

  async renewIfOwner(params: RenewIfOwnerParams): Promise<boolean> {
    const reply = await redis.eval(RENEW_IF_OWNER_SCRIPT, 1, params.key, params.owner, params.ttlSeconds);
    return reply === 1;
  }

  async releaseIfOwner(params: ReleaseIfOwnerParams): Promise<boolean> {
    const reply = await redis.eval(RELEASE_IF_OWNER_SCRIPT, 1, params.key, params.owner);
    return reply === 1;
  }

  async delete(key: string): Promise<void> {
    await redis.del(key);
  }
}
