/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { InfraFailureCounterInterface } from '@/modules/infra/types/infraFailureCounter.interface';
import type { LockAgentParams, RecordFailureParams } from '@/modules/infra/types/infraFailureCounter.types';

export class FakeFailureCounter implements InfraFailureCounterInterface {
  readonly failures = new Map<string, number>();
  readonly locks = new Map<string, number>();
  readonly windowSecondsUsed: number[] = [];

  async recordFailure({ agentId, windowSeconds }: RecordFailureParams): Promise<number> {
    this.windowSecondsUsed.push(windowSeconds);
    const count = (this.failures.get(agentId) ?? 0) + 1;
    this.failures.set(agentId, count);

    return count;
  }

  async lock({ agentId, seconds }: LockAgentParams): Promise<void> {
    this.locks.set(agentId, seconds);
  }

  async getLockRemainingSeconds(agentId: string): Promise<number | undefined> {
    return this.locks.get(agentId);
  }

  async reset(agentId: string): Promise<void> {
    this.failures.delete(agentId);
  }
}
