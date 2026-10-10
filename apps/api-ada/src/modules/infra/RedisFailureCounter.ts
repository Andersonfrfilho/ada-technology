/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { redis } from '@/infra/cache/redisClient';
import { INFRA_FAILURES_KEY_PREFIX, INFRA_LOCK_KEY_PREFIX } from '@/modules/infra/infraPasswordLock.constant';
import type { InfraFailureCounterInterface } from '@/modules/infra/types/infraFailureCounter.interface';
import type { LockAgentParams, RecordFailureParams } from '@/modules/infra/types/infraFailureCounter.types';

const RECORD_FAILURE_SCRIPT =
  "local count = redis.call('incr', KEYS[1]) if count == 1 then redis.call('expire', KEYS[1], ARGV[1]) end return count";
const MILLISECONDS_PER_SECOND = 1000;

export class RedisFailureCounter implements InfraFailureCounterInterface {
  async recordFailure({ agentId, windowSeconds }: RecordFailureParams): Promise<number> {
    const count = await redis.eval(RECORD_FAILURE_SCRIPT, 1, failuresKey(agentId), windowSeconds);

    return Number(count);
  }

  async lock({ agentId, seconds }: LockAgentParams): Promise<void> {
    await redis.set(lockKey(agentId), '1', 'EX', seconds);
  }

  async getLockRemainingSeconds(agentId: string): Promise<number | undefined> {
    const remainingMilliseconds = await redis.pttl(lockKey(agentId));
    if (remainingMilliseconds <= 0) return undefined;

    return Math.ceil(remainingMilliseconds / MILLISECONDS_PER_SECOND);
  }

  async reset(agentId: string): Promise<void> {
    await redis.del(failuresKey(agentId));
  }
}

function failuresKey(agentId: string): string {
  return `${INFRA_FAILURES_KEY_PREFIX}${agentId}`;
}

function lockKey(agentId: string): string {
  return `${INFRA_LOCK_KEY_PREFIX}${agentId}`;
}
