/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { InfraOperationNotFoundError } from '@/modules/infra/infra.error';
import type { GetInfraOperationParams, GetInfraOperationResult } from '@/modules/infra/types/infra.types';
import type { InfraOperationRepositoryInterface } from '@/modules/infra/types/infraOperationRepository.interface';

type Dependencies = {
  readonly operationRepository: InfraOperationRepositoryInterface;
};

/** Projeta so o que o painel precisa: ator e projeto do Railway ficam no banco. */
export class GetInfraOperationUseCase {
  constructor(private readonly dependencies: Dependencies) {}

  async execute({ operationId }: GetInfraOperationParams): Promise<GetInfraOperationResult> {
    const operation = await this.dependencies.operationRepository.findById(operationId);
    if (!operation) throw new InfraOperationNotFoundError();

    return {
      id: operation.id,
      kind: operation.kind,
      status: operation.status,
      trigger: operation.trigger,
      serviceResults: operation.serviceResults,
      startedAt: operation.startedAt,
      finishedAt: operation.finishedAt,
      railwayEnvironmentId: operation.railwayEnvironmentId,
    };
  }
}
