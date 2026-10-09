/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { RailwayProject, RailwayServiceInstance } from '@/modules/infra/types/railwayInventory.types';

export function buildProject(params: {
  readonly environmentId: string;
  readonly environmentName: string;
  readonly services: readonly RailwayServiceInstance[];
}): RailwayProject {
  return {
    id: 'project-1',
    name: 'ada',
    environments: [{ id: params.environmentId, name: params.environmentName, services: params.services }],
  };
}
