/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { RailwayGateway } from '@/modules/infra/RailwayGateway';
import type { CreateRailwayGatewayParams } from '@/modules/infra/types/infra.types';
import type { RailwayGatewayInterface } from '@/modules/infra/types/railwayGateway.interface';

export function createRailwayGateway(params: CreateRailwayGatewayParams): RailwayGatewayInterface | undefined {
  // Token vazio desliga o módulo: os use cases lançam InfraNotConfiguredError quando o gateway é undefined.
  if (params.token.length === 0) return undefined;
  return new RailwayGateway({ token: params.token, workspaceId: params.workspaceId });
}
