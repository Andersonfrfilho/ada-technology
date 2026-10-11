/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { INFRA_ACCESS_CACHE_KEY } from '@/modules/infra/infra.constant';
import { buildIntegrationView } from '@/modules/infra/buildIntegrationView';
import { parseAccessStatus } from '@/modules/infra/infraAccessCache';
import type {
  GetInfraIntegrationDependencies,
  GetInfraIntegrationResult,
} from '@/modules/infra/types/infraIntegrationUseCases.types';

/** So estado: o `access` vem do cache e o Railway nunca e chamado na abertura da tela. */
export class GetInfraIntegrationUseCase {
  constructor(private readonly dependencies: GetInfraIntegrationDependencies) {}

  async execute(): Promise<GetInfraIntegrationResult> {
    const { gatewayProvider, cache, findAgentName } = this.dependencies;
    const description = await gatewayProvider.describe();
    const access = parseAccessStatus(await cache.get(INFRA_ACCESS_CACHE_KEY));
    const updatedByName =
      description.updatedByAgentId !== undefined && findAgentName
        ? await findAgentName(description.updatedByAgentId)
        : undefined;
    return buildIntegrationView({ description, updatedByName, access });
  }
}
