/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type {
  CreateInfraOperationParams,
  FinishInfraOperationParams,
  FindRunningOperationParams,
  InfraOperationRecord,
  ListRunningOperationsParams,
  MarkStaleRunningAsInterruptedParams,
} from '@/modules/infra/types/infra.types';

export interface InfraOperationRepositoryInterface {
  create(params: CreateInfraOperationParams): Promise<InfraOperationRecord>;
  findById(id: string): Promise<InfraOperationRecord | undefined>;
  /** Ignora operações com `startedAt` anterior a `notOlderThan`: passado o TTL da trava, a operação está morta. */
  findRunningByEnvironmentId(params: FindRunningOperationParams): Promise<InfraOperationRecord | undefined>;
  /** Uma consulta para todos os ambientes; mesma regra de `notOlderThan`. */
  listRunning(params: ListRunningOperationsParams): Promise<readonly InfraOperationRecord[]>;
  finishOperation(params: FinishInfraOperationParams): Promise<void>;
  /** Devolve as operações marcadas como interrompidas. */
  markStaleRunningAsInterrupted(params: MarkStaleRunningAsInterruptedParams): Promise<readonly InfraOperationRecord[]>;
}
