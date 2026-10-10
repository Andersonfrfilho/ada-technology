/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { eq } from 'drizzle-orm';

import { database } from '@/infra/database/client';
import { infraIntegrationSecrets } from '@/infra/database/schema';
import { upsertIntegrationRow } from '@/modules/infra/upsertIntegrationRow';
import type { InfraIntegrationProvider } from '@/modules/infra/infra.constant';
import type {
  InfraIntegrationRecord,
  UpsertLockedIntegrationParams,
  UpsertLockedIntegrationResult,
} from '@/modules/infra/types/infraIntegration.types';
import type { InfraIntegrationRepositoryInterface } from '@/modules/infra/types/infraIntegrationRepository.interface';
import type { IntegrationRowOperations } from '@/modules/infra/types/upsertIntegrationRow.types';

type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];

async function selectForUpdate(
  transaction: Transaction,
  provider: InfraIntegrationProvider,
): Promise<InfraIntegrationRecord | undefined> {
  const [row] = await transaction
    .select()
    .from(infraIntegrationSecrets)
    .where(eq(infraIntegrationSecrets.provider, provider))
    .for('update')
    .limit(1);
  return row;
}

function buildValues(params: UpsertLockedIntegrationParams) {
  return {
    provider: params.provider,
    workspaceId: params.workspaceId,
    ciphertext: params.ciphertext,
    keyId: params.keyId,
    tokenHint: params.tokenHint,
    updatedByAgentId: params.agentId ?? null,
  };
}

async function replaceRow(
  transaction: Transaction,
  params: UpsertLockedIntegrationParams,
): Promise<InfraIntegrationRecord | undefined> {
  const [row] = await transaction
    .update(infraIntegrationSecrets)
    .set({ ...buildValues(params), updatedAt: new Date() })
    .where(eq(infraIntegrationSecrets.provider, params.provider))
    .returning();
  return row;
}

function buildRowOperations(transaction: Transaction, params: UpsertLockedIntegrationParams): IntegrationRowOperations {
  return {
    lockExisting: async () => (await selectForUpdate(transaction, params.provider)) !== undefined,
    insertIfAbsent: async () => {
      const [inserted] = await transaction
        .insert(infraIntegrationSecrets)
        .values(buildValues(params))
        .onConflictDoNothing({ target: infraIntegrationSecrets.provider })
        .returning();
      return inserted;
    },
    replace: () => replaceRow(transaction, params),
  };
}

export class DrizzleInfraIntegrationRepository implements InfraIntegrationRepositoryInterface {
  async findByProvider(provider: InfraIntegrationProvider): Promise<InfraIntegrationRecord | undefined> {
    const [row] = await database
      .select()
      .from(infraIntegrationSecrets)
      .where(eq(infraIntegrationSecrets.provider, provider))
      .limit(1);
    return row;
  }

  async upsertLocked(params: UpsertLockedIntegrationParams): Promise<UpsertLockedIntegrationResult> {
    return database.transaction((transaction) => upsertIntegrationRow(buildRowOperations(transaction, params)));
  }

  async deleteLocked(provider: InfraIntegrationProvider): Promise<boolean> {
    return database.transaction(async (transaction) => {
      if (!(await selectForUpdate(transaction, provider))) return false;
      await transaction.delete(infraIntegrationSecrets).where(eq(infraIntegrationSecrets.provider, provider));
      return true;
    });
  }
}
