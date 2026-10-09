/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { FakeOperationRepository } from '@/modules/infra/infraFakes';
import { RecoverInterruptedInfraOperationsUseCase } from '@/modules/infra/recoverInterruptedInfraOperations.use-case';

describe('RecoverInterruptedInfraOperationsUseCase', () => {
  it('marks operations older than wait + 600 s and returns the count', async () => {
    const repository = new FakeOperationRepository();
    repository.staleResult = 2;
    const useCase = new RecoverInterruptedInfraOperationsUseCase({
      operationRepository: repository,
      databaseWaitSeconds: 120,
      now: () => new Date('2026-10-09T12:00:00.000Z'),
    });

    const recovered = await useCase.execute();

    expect(recovered).toBe(2);
    expect(repository.staleCalls).toEqual([{ olderThan: new Date('2026-10-09T11:48:00.000Z') }]);
  });

  it('returns zero when nothing is stale', async () => {
    const repository = new FakeOperationRepository();
    const useCase = new RecoverInterruptedInfraOperationsUseCase({
      operationRepository: repository,
      databaseWaitSeconds: 600,
      now: () => new Date('2026-10-09T12:00:00.000Z'),
    });

    expect(await useCase.execute()).toBe(0);
    expect(repository.staleCalls[0]?.olderThan).toEqual(new Date('2026-10-09T11:40:00.000Z'));
  });
});
