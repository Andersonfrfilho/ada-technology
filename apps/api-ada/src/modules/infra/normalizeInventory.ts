/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */


import { normalizeServiceInstance } from '@/modules/infra/normalizeServiceInstance';
import type { InventoryResponse } from '@/modules/infra/railwayGateway.schema';
import type { RailwayProject } from '@/modules/infra/types/railwayInventory.types';

export function normalizeInventory(data: InventoryResponse): RailwayProject[] {
  return data.projects.edges.map(({ node: project }) => ({
    id: project.id,
    name: project.name,
    environments: project.environments.edges.map(({ node: environment }) => ({
      id: environment.id,
      name: environment.name,
      services: environment.serviceInstances.edges.map(({ node }) => normalizeServiceInstance(node)),
    })),
  }));
}
