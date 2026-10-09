/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { classifyEnvironment } from '@/modules/infra/classifyEnvironment';
import { INFRA_ENVIRONMENT_CLASSIFICATION } from '@/modules/infra/infra.constant';
import { InfraEnvironmentNotFoundError, InfraEnvironmentProtectedError } from '@/modules/infra/infra.error';
import type { LocatedEnvironment, LocateManagedEnvironmentParams } from '@/modules/infra/types/infra.types';

/** Inventario fresco, sem cache: a decisao de mexer no ambiente nao pode usar leitura de 30 s atras. */
export async function locateManagedEnvironment(params: LocateManagedEnvironmentParams): Promise<LocatedEnvironment> {
  const { railwayGateway, environmentId, managedPattern, selfEnvironmentId } = params;
  const inventory = await railwayGateway.listInventory();

  for (const project of inventory) {
    const environment = project.environments.find((candidate) => candidate.id === environmentId);
    if (!environment) continue;

    const classification = classifyEnvironment({
      environmentName: environment.name,
      environmentId: environment.id,
      managedPattern,
      selfEnvironmentId,
    });
    if (classification !== INFRA_ENVIRONMENT_CLASSIFICATION.MANAGED) throw new InfraEnvironmentProtectedError();

    return { project, environment };
  }

  throw new InfraEnvironmentNotFoundError();
}
