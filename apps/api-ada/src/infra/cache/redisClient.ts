/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { Redis } from 'ioredis';

import { environment } from '@/infra/config/environment';

export const redis = new Redis(environment.REDIS_URL, { maxRetriesPerRequest: null });

// Conexao separada porque uma conexao em modo subscribe nao aceita mais nenhum comando —
// reaproveitar a de cima deixaria get/set mudos assim que o primeiro canal fosse assinado.
export const redisSubscriber = redis.duplicate();

export async function closeRedis(): Promise<void> {
  await Promise.all([redis.quit(), redisSubscriber.quit()]);
}
