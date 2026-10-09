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
  InfraOperationRecord,
  MarkStaleRunningAsInterruptedParams,
} from '@/modules/infra/types/infra.types';

export interface InfraOperationRepositoryInterface {
  create(params: CreateInfraOperationParams): Promise<InfraOperationRecord>;
  findById(id: string): Promise<InfraOperationRecord | undefined>;
  findRunningByEnvironmentId(environmentId: string): Promise<InfraOperationRecord | undefined>;
  finishOperation(params: FinishInfraOperationParams): Promise<void>;
  /** Devolve quantas operacoes foram marcadas. */
  markStaleRunningAsInterrupted(params: MarkStaleRunningAsInterruptedParams): Promise<number>;
}
