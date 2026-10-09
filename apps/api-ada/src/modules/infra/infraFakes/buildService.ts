/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { RailwayServiceInstance } from '@/modules/infra/types/railwayInventory.types';

export type ServiceShape = 'running' | 'stopped' | 'none';

export function buildService(params: {
  readonly name: string;
  readonly shape?: ServiceShape;
  readonly image?: string;
}): RailwayServiceInstance {
  const shape = params.shape ?? 'running';
  return {
    serviceId: `svc-${params.name}`,
    serviceName: params.name,
    ...(params.image ? { sourceImage: params.image } : {}),
    ...(shape === 'none' ? {} : { latestDeploymentId: `dep-${params.name}` }),
    hasDeployment: shape !== 'none',
    isStopped: shape === 'stopped',
    ...(shape === 'none' ? {} : { instanceStatus: shape === 'running' ? 'RUNNING' : 'EXITED' }),
  };
}
