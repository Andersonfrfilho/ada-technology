/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { eq } from 'drizzle-orm';

import { database } from '@/infra/database/client';
import { infraEnvironmentSchedules } from '@/infra/database/schema';
import type { InfraScheduleRepositoryInterface } from '@/modules/infra/types/infraScheduleRepository.interface';
import type { InfraScheduleRecord, UpsertInfraScheduleParams } from '@/modules/infra/types/infra.types';

export class DrizzleInfraScheduleRepository implements InfraScheduleRepositoryInterface {
  async findByEnvironmentId(environmentId: string): Promise<InfraScheduleRecord | undefined> {
    const [row] = await database
      .select()
      .from(infraEnvironmentSchedules)
      .where(eq(infraEnvironmentSchedules.railwayEnvironmentId, environmentId))
      .limit(1);

    return row;
  }

  async listAll(): Promise<readonly InfraScheduleRecord[]> {
    return database.select().from(infraEnvironmentSchedules);
  }

  async upsert(params: UpsertInfraScheduleParams): Promise<InfraScheduleRecord> {
    const values = {
      railwayProjectId: params.railwayProjectId,
      railwayEnvironmentId: params.railwayEnvironmentId,
      activeWeekdays: [...params.activeWeekdays],
      powerOnTime: params.powerOnTime,
      powerOffTime: params.powerOffTime,
      isEnabled: params.isEnabled,
      ...(params.updatedByAgentId ? { updatedByAgentId: params.updatedByAgentId } : {}),
    };

    const [row] = await database
      .insert(infraEnvironmentSchedules)
      .values(values)
      .onConflictDoUpdate({
        target: infraEnvironmentSchedules.railwayEnvironmentId,
        set: { ...values, updatedAt: new Date() },
      })
      .returning();

    if (!row) throw new Error('Upsert da agenda de infra nao retornou linha');
    return row;
  }
}
