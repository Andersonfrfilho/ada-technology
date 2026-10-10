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
import type { InfraIntegrationProvider } from '@/modules/infra/infra.constant';
import type {
  InfraIntegrationRecord,
  UpsertLockedIntegrationParams,
  UpsertLockedIntegrationResult,
} from '@/modules/infra/types/infraIntegration.types';
import type { InfraIntegrationRepositoryInterface } from '@/modules/infra/types/infraIntegrationRepository.interface';

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

async function upsertInTransaction(
  transaction: Transaction,
  params: UpsertLockedIntegrationParams,
): Promise<UpsertLockedIntegrationResult> {
  if (await selectForUpdate(transaction, params.provider)) return replaceExisting(transaction, params);

  const [inserted] = await transaction
    .insert(infraIntegrationSecrets)
    .values(buildValues(params))
    .onConflictDoNothing({ target: infraIntegrationSecrets.provider })
    .returning();
  if (inserted) return { record: inserted, wasReplacement: false };

  // Um INSERT concorrente venceu a unicidade e ja commitou: aqui a linha existe, entao e troca.
  await selectForUpdate(transaction, params.provider);
  return replaceExisting(transaction, params);
}

async function replaceExisting(
  transaction: Transaction,
  params: UpsertLockedIntegrationParams,
): Promise<UpsertLockedIntegrationResult> {
  const record = await replaceRow(transaction, params);
  if (!record) throw new Error('Troca da integracao de infra nao retornou linha');
  return { record, wasReplacement: true };
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
    return database.transaction((transaction) => upsertInTransaction(transaction, params));
  }

  async deleteLocked(provider: InfraIntegrationProvider): Promise<boolean> {
    return database.transaction(async (transaction) => {
      if (!(await selectForUpdate(transaction, provider))) return false;
      await transaction.delete(infraIntegrationSecrets).where(eq(infraIntegrationSecrets.provider, provider));
      return true;
    });
  }
}
