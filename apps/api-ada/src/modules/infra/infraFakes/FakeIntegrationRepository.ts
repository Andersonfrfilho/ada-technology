/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { FAKE_NOW } from '@/modules/infra/infraFakes/fakeNow.constant';
import type { InfraIntegrationProvider } from '@/modules/infra/infra.constant';
import type {
  InfraIntegrationRecord,
  UpsertLockedIntegrationParams,
  UpsertLockedIntegrationResult,
} from '@/modules/infra/types/infraIntegration.types';
import type { InfraIntegrationRepositoryInterface } from '@/modules/infra/types/infraIntegrationRepository.interface';

export class FakeIntegrationRepository implements InfraIntegrationRepositoryInterface {
  readonly records = new Map<string, InfraIntegrationRecord>();

  seed(record: InfraIntegrationRecord): void {
    this.records.set(record.provider, record);
  }

  async findByProvider(provider: InfraIntegrationProvider): Promise<InfraIntegrationRecord | undefined> {
    return this.records.get(provider);
  }

  async upsertLocked(params: UpsertLockedIntegrationParams): Promise<UpsertLockedIntegrationResult> {
    const existing = this.records.get(params.provider);
    const record: InfraIntegrationRecord = {
      id: existing?.id ?? `integration-${this.records.size + 1}`,
      provider: params.provider,
      workspaceId: params.workspaceId,
      ciphertext: params.ciphertext,
      keyId: params.keyId,
      tokenHint: params.tokenHint,
      updatedByAgentId: params.agentId ?? null,
      createdAt: existing?.createdAt ?? FAKE_NOW,
      updatedAt: FAKE_NOW,
    };
    this.records.set(params.provider, record);
    return { record, wasReplacement: existing !== undefined };
  }

  async deleteLocked(provider: InfraIntegrationProvider): Promise<boolean> {
    return this.records.delete(provider);
  }
}
