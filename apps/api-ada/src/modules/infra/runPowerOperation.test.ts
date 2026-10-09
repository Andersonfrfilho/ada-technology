/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { INFRA_POWER_DIRECTION } from '@/modules/infra/infra.constant';
import { RunPowerOperation } from '@/modules/infra/runPowerOperation';
import type { InfraPowerDirection } from '@/modules/infra/infra.constant';
import type { RailwayServiceInstance } from '@/modules/infra/types/infra.types';
import type { RailwayGatewayInterface } from '@/modules/infra/types/railwayGateway.interface';

const ENVIRONMENT_ID = 'env-staging';

function buildWebService(overrides: Partial<RailwayServiceInstance>): RailwayServiceInstance {
  return {
    serviceId: 'svc-web',
    serviceName: 'web',
    hasDeployment: true,
    isStopped: false,
    instanceStatus: 'RUNNING',
    ...overrides,
  };
}

async function run(direction: InfraPowerDirection, service: RailwayServiceInstance): Promise<readonly string[]> {
  const mutations: string[] = [];
  const railwayGateway = {
    stopDeployment: async ({ deploymentId }: { deploymentId: string }) => void mutations.push(`stop:${deploymentId}`),
    restartDeployment: async ({ deploymentId }: { deploymentId: string }) => void mutations.push(`restart:${deploymentId}`),
    redeployService: async ({ serviceId }: { serviceId: string }) => void mutations.push(`redeploy:${serviceId}`),
  } as unknown as RailwayGatewayInterface;
  const operation = new RunPowerOperation({ railwayGateway, sleep: async () => undefined, databaseWaitSeconds: 10 });

  await operation.execute({ direction, environmentId: ENVIRONMENT_ID, services: [service], onProgress: async () => undefined });
  return mutations;
}

describe('RunPowerOperation (deployment alvo)', () => {
  it('desligar mira o deployment ATIVO quando difere do ultimo', async () => {
    const mutations = await run(
      INFRA_POWER_DIRECTION.OFF,
      buildWebService({ latestDeploymentId: 'dep-new', activeDeploymentId: 'dep-old' }),
    );

    expect(mutations).toEqual(['stop:dep-old']);
  });

  it('desligar sem ativo mira o ultimo', async () => {
    const mutations = await run(INFRA_POWER_DIRECTION.OFF, buildWebService({ latestDeploymentId: 'dep-last' }));

    expect(mutations).toEqual(['stop:dep-last']);
  });

  it('religar reinicia o deployment ATIVO parado', async () => {
    const mutations = await run(
      INFRA_POWER_DIRECTION.ON,
      buildWebService({ latestDeploymentId: 'dep-new', activeDeploymentId: 'dep-old', isStopped: true, instanceStatus: 'EXITED' }),
    );

    expect(mutations).toEqual(['restart:dep-old']);
  });

  it('religar sem nenhum deployment faz redeploy do servico', async () => {
    const mutations = await run(INFRA_POWER_DIRECTION.ON, buildWebService({ hasDeployment: false }));

    expect(mutations).toEqual(['redeploy:svc-web']);
  });
});
