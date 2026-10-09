/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { and, eq, lt } from 'drizzle-orm';

import { database } from '@/infra/database/client';
import { infraPowerOperations } from '@/infra/database/schema';
import { INFRA_OPERATION_STATUS } from '@/modules/infra/infra.constant';
import { infraServiceResultsSchema } from '@/modules/infra/infraOperation.schema';
import type { InfraOperationRepositoryInterface } from '@/modules/infra/types/infraOperationRepository.interface';
import type {
  CreateInfraOperationParams,
  FinishInfraOperationParams,
  InfraOperationRecord,
  InfraOperationRow,
  MarkStaleRunningAsInterruptedParams,
} from '@/modules/infra/types/infra.types';

function toRecord(row: InfraOperationRow): InfraOperationRecord {
  return { ...row, serviceResults: infraServiceResultsSchema.parse(row.serviceResults) };
}

export class DrizzleInfraOperationRepository implements InfraOperationRepositoryInterface {
  async create(params: CreateInfraOperationParams): Promise<InfraOperationRecord> {
    const [row] = await database
      .insert(infraPowerOperations)
      .values({
        railwayProjectId: params.railwayProjectId,
        railwayEnvironmentId: params.railwayEnvironmentId,
        kind: params.kind,
        trigger: params.trigger,
        status: INFRA_OPERATION_STATUS.RUNNING,
        ...(params.actorAgentId ? { actorAgentId: params.actorAgentId } : {}),
      })
      .returning();

    if (!row) throw new Error('Insert da operacao de infra nao retornou linha');
    return toRecord(row);
  }

  async findById(id: string): Promise<InfraOperationRecord | undefined> {
    const [row] = await database
      .select()
      .from(infraPowerOperations)
      .where(eq(infraPowerOperations.id, id))
      .limit(1);

    return row ? toRecord(row) : undefined;
  }

  async findRunningByEnvironmentId(environmentId: string): Promise<InfraOperationRecord | undefined> {
    const [row] = await database
      .select()
      .from(infraPowerOperations)
      .where(
        and(
          eq(infraPowerOperations.railwayEnvironmentId, environmentId),
          eq(infraPowerOperations.status, INFRA_OPERATION_STATUS.RUNNING),
        ),
      )
      .limit(1);

    return row ? toRecord(row) : undefined;
  }

  async finishOperation(params: FinishInfraOperationParams): Promise<void> {
    await database
      .update(infraPowerOperations)
      .set({
        status: params.status,
        serviceResults: [...params.serviceResults],
        finishedAt: params.finishedAt,
      })
      .where(eq(infraPowerOperations.id, params.id));
  }

  async markStaleRunningAsInterrupted(params: MarkStaleRunningAsInterruptedParams): Promise<number> {
    const rows = await database
      .update(infraPowerOperations)
      .set({ status: INFRA_OPERATION_STATUS.FAILED, finishedAt: new Date() })
      .where(
        and(
          eq(infraPowerOperations.status, INFRA_OPERATION_STATUS.RUNNING),
          lt(infraPowerOperations.startedAt, params.olderThan),
        ),
      )
      .returning({ id: infraPowerOperations.id });

    return rows.length;
  }
}
