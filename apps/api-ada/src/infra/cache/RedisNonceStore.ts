/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { NonceStoreInterface } from '@adatechnology/meta-whatsapp-module';

import { redis } from '@/infra/cache/redisClient';

const NONCE_KEY_PREFIX = 'webhook:nonce:';

export class RedisNonceStore implements NonceStoreInterface {
  // SET NX num unico comando: um get seguido de set deixaria duas entregas simultaneas da Meta
  // lerem "ausente" e ambas seguirem, que e exatamente o replay que o nonce existe para barrar.
  async setIfAbsent(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await redis.set(`${NONCE_KEY_PREFIX}${key}`, '1', 'EX', ttlSeconds, 'NX');

    return result === 'OK';
  }
}
