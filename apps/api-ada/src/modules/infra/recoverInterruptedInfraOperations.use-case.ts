/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { INFRA_OPERATION_LOCK_GRACE_SECONDS } from '@/modules/infra/infra.constant';
import type { InfraOperationRepositoryInterface } from '@/modules/infra/types/infraOperationRepository.interface';

type Dependencies = {
  readonly operationRepository: InfraOperationRepositoryInterface;
  readonly databaseWaitSeconds: number;
  readonly now: () => Date;
};

const MILLISECONDS_PER_SECOND = 1000;

/**
 * No boot, operacao `running` mais velha que o TTL da trava e de um processo que morreu no meio
 * (deploy, crash): sem isto o painel mostraria "em andamento" para sempre.
 */
export class RecoverInterruptedInfraOperationsUseCase {
  constructor(private readonly dependencies: Dependencies) {}

  async execute(): Promise<number> {
    const { operationRepository, databaseWaitSeconds, now } = this.dependencies;
    const staleAfterMilliseconds = (databaseWaitSeconds + INFRA_OPERATION_LOCK_GRACE_SECONDS) * MILLISECONDS_PER_SECOND;

    return operationRepository.markStaleRunningAsInterrupted({
      olderThan: new Date(now().getTime() - staleAfterMilliseconds),
    });
  }
}
