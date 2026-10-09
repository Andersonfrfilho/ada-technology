/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { InfraAccessStatus } from '@/modules/infra/infra.constant';
import type {
  GetUsageParams,
  RailwayBillingCycle,
  RailwayEstimatedUsageRow,
  RailwayProject,
  RailwayUsageRow,
  RedeployServiceParams,
  RestartDeploymentParams,
  StopDeploymentParams,
} from '@/modules/infra/types/infra.types';

export interface RailwayGatewayInterface {
  listInventory(): Promise<readonly RailwayProject[]>;
  stopDeployment(params: StopDeploymentParams): Promise<void>;
  restartDeployment(params: RestartDeploymentParams): Promise<void>;
  redeployService(params: RedeployServiceParams): Promise<void>;
  getBillingCycle(): Promise<RailwayBillingCycle>;
  getUsage(params: GetUsageParams): Promise<readonly RailwayUsageRow[]>;
  getEstimatedUsage(): Promise<readonly RailwayEstimatedUsageRow[]>;
  /** Nao lanca: qualquer falha vira um status. */
  verifyAccess(): Promise<InfraAccessStatus>;
}
