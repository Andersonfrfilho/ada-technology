/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { InfraScheduleRecord, UpsertInfraScheduleParams } from '@/modules/infra/types/infra.types';

export interface InfraScheduleRepositoryInterface {
  findByEnvironmentId(environmentId: string): Promise<InfraScheduleRecord | undefined>;
  listAll(): Promise<readonly InfraScheduleRecord[]>;
  upsert(params: UpsertInfraScheduleParams): Promise<InfraScheduleRecord>;
}
