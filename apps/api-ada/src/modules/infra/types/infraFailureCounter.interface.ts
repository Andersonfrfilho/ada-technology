/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { LockAgentParams, RecordFailureParams } from '@/modules/infra/types/infraFailureCounter.types';

export interface InfraFailureCounterInterface {
  /** INCR atômico; o EXPIRE só entra na primeira falha da janela. Devolve a contagem. */
  recordFailure(params: RecordFailureParams): Promise<number>;
  lock(params: LockAgentParams): Promise<void>;
  /** Segundos de bloqueio que faltam; `undefined` se não há bloqueio ativo. */
  getLockRemainingSeconds(agentId: string): Promise<number | undefined>;
  /** Zera o contador de falhas (o bloqueio, se houver, segue até expirar). */
  reset(agentId: string): Promise<void>;
}
