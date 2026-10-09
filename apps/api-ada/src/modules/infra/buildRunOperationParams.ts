/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { PowerEnvironmentParams, RunOperationParams } from '@/modules/infra/types/infraOperation.types';
import type { RailwayEnvironment, RailwayProject } from '@/modules/infra/types/railwayInventory.types';

type BuildRunOperationParamsOptions = {
  readonly operationId: string;
  readonly params: PowerEnvironmentParams;
  readonly project: RailwayProject;
  readonly environment: RailwayEnvironment;
  readonly lockOwner: string;
};

export function buildRunOperationParams(options: BuildRunOperationParamsOptions): RunOperationParams {
  const { operationId, params, project, environment, lockOwner } = options;
  return {
    operationId,
    projectId: project.id,
    projectName: project.name,
    environmentId: environment.id,
    environmentName: environment.name,
    services: environment.services,
    actor: params.actor,
    trigger: params.trigger,
    lockOwner,
    ...(params.ipAddress ? { ipAddress: params.ipAddress } : {}),
  };
}
