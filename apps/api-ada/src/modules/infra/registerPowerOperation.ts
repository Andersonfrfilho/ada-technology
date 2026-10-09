/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { INFRA_OPERATION_KIND, INFRA_POWER_DIRECTION, type InfraPowerDirection } from '@/modules/infra/infra.constant';
import type { InfraOperationLock } from '@/modules/infra/InfraOperationLock';
import type { InfraOperationRecord, PowerEnvironmentParams } from '@/modules/infra/types/infraOperation.types';
import type { InfraOperationRepositoryInterface } from '@/modules/infra/types/infraOperationRepository.interface';
import type { InfraScheduleRepositoryInterface } from '@/modules/infra/types/infraScheduleRepository.interface';
import type { RailwayProject } from '@/modules/infra/types/railwayInventory.types';

type RegisterPowerOperationParams = {
  readonly params: PowerEnvironmentParams;
  readonly project: RailwayProject;
  readonly keepOnUntilChange: Date | null | undefined;
  readonly lockOwner: string;
  readonly direction: InfraPowerDirection;
  readonly lock: InfraOperationLock;
  readonly scheduleRepository: InfraScheduleRepositoryInterface;
  readonly operationRepository: InfraOperationRepositoryInterface;
};

export async function registerPowerOperation(options: RegisterPowerOperationParams): Promise<InfraOperationRecord> {
  const { params, project, keepOnUntilChange, lockOwner, direction, lock } = options;
  try {
    if (keepOnUntilChange !== undefined) {
      await options.scheduleRepository.setKeepOnUntil({
        environmentId: params.environmentId,
        keepOnUntil: keepOnUntilChange,
      });
    }
    return await options.operationRepository.create({
      railwayProjectId: project.id,
      railwayEnvironmentId: params.environmentId,
      kind: direction === INFRA_POWER_DIRECTION.OFF ? INFRA_OPERATION_KIND.POWER_OFF : INFRA_OPERATION_KIND.POWER_ON,
      trigger: params.trigger,
      ...(params.actor.agentId ? { actorAgentId: params.actor.agentId } : {}),
    });
  } catch (error) {
    // Cleanup de recurso: sem isto a trava ficaria presa ate o TTL por uma falha do banco.
    await lock.release({ environmentId: params.environmentId, lockOwner });
    throw error;
  }
}
