/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */


import { INFRA_EXECUTING_INSTANCE_STATUSES } from '@/modules/infra/infra.constant';
import type { ServiceInstanceNode } from '@/modules/infra/railwayGateway.schema';
import type { RailwayServiceInstance } from '@/modules/infra/types/railwayInventory.types';

const EXITED_INSTANCE_STATUS = 'EXITED';

export function normalizeServiceInstance(node: ServiceInstanceNode): RailwayServiceInstance {
  const deployment = node.latestDeployment;
  const activeDeployment = node.activeDeployments?.[0];
  const instanceStatus = deployment?.instances[0]?.status;
  const sourceImage = node.source?.image;
  // O deployment ativo e o que de fato roda: o ultimo pode estar em build ou ter falhado.
  const isDeploymentStopped = (activeDeployment ?? deployment)?.deploymentStopped === true;
  const isStopped = isDeploymentStopped || instanceStatus === EXITED_INSTANCE_STATUS;
  // Só interessa quando o Railway diz "parado" e ainda há instância executando: o resto já sai do estado de energia.
  const hasRunningInstance =
    isStopped &&
    [...(deployment?.instances ?? []), ...(activeDeployment?.instances ?? [])].some((instance) =>
      INFRA_EXECUTING_INSTANCE_STATUSES.includes(instance.status),
    );

  return {
    serviceId: node.serviceId,
    serviceName: node.serviceName,
    ...(sourceImage ? { sourceImage } : {}),
    ...(deployment ? { latestDeploymentId: deployment.id } : {}),
    ...(activeDeployment ? { activeDeploymentId: activeDeployment.id } : {}),
    hasDeployment: Boolean(deployment),
    isStopped,
    ...(instanceStatus ? { instanceStatus } : {}),
    ...(hasRunningInstance ? { hasRunningInstance } : {}),
  };
}
