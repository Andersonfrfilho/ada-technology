/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { INFRA_INTEGRATION_STATE } from '@/modules/infra/types/railwayGatewayProvider.types';
import type { RailwayGatewayInterface } from '@/modules/infra/types/railwayGateway.interface';
import type { RailwayGatewayProvider } from '@/modules/infra/types/railwayGatewayProvider.types';

export function buildStaticGatewayProvider(gateway: RailwayGatewayInterface | undefined): RailwayGatewayProvider {
  return {
    resolve: async () => gateway,
    describe: async () => ({
      source: gateway ? 'environment' : 'none',
      state: gateway ? INFRA_INTEGRATION_STATE.CONFIGURED : INFRA_INTEGRATION_STATE.NOT_CONFIGURED,
      environmentTokenAlsoPresent: false,
    }),
    invalidate: () => undefined,
    isCurrent: () => true,
  };
}
