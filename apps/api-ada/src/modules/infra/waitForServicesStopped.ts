/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */


import {
  INFRA_DATABASE_POLL_INTERVAL_SECONDS,
  INFRA_SERVICE_POWER_STATE,
  INFRA_STOP_VERIFY_WAIT_SECONDS,
} from '@/modules/infra/infra.constant';
import { resolveServicePowerState } from '@/modules/infra/resolveServicePowerState';
import type { InfraSleep } from '@/modules/infra/types/infraRuntime.types';
import type { RailwayGatewayInterface } from '@/modules/infra/types/railwayGateway.interface';
import type { RailwayServiceInstance } from '@/modules/infra/types/railwayInventory.types';

const MILLISECONDS_PER_SECOND = 1000;

export type WaitForServicesStoppedParams = {
  readonly railwayGateway: RailwayGatewayInterface;
  readonly sleep: InfraSleep;
  readonly environmentId: string;
  readonly serviceNames: readonly string[];
  readonly onProgress: () => Promise<void>;
};

type FindStillRunningParams = {
  readonly railwayGateway: RailwayGatewayInterface;
  readonly environmentId: string;
  readonly serviceNames: ReadonlySet<string>;
};

function isFullyStopped(service: RailwayServiceInstance): boolean {
  const state = resolveServicePowerState(service);
  const isOff = state === INFRA_SERVICE_POWER_STATE.STOPPED || state === INFRA_SERVICE_POWER_STATE.NO_DEPLOYMENT;
  return isOff && service.hasRunningInstance !== true;
}

/** Devolve os servicos que o Railway aceitou parar mas seguem executando no prazo; uma consulta a cada 5 s. */
export async function waitForServicesStopped(params: WaitForServicesStoppedParams): Promise<ReadonlySet<string>> {
  const { railwayGateway, sleep, environmentId, serviceNames, onProgress } = params;
  const maxPolls = Math.floor(INFRA_STOP_VERIFY_WAIT_SECONDS / INFRA_DATABASE_POLL_INTERVAL_SECONDS);
  let pendingNames: ReadonlySet<string> = new Set(serviceNames);

  // Sequencial por natureza: cada consulta depende de a anterior ter dito que algo ainda executa.
  for (let poll = 0; pendingNames.size > 0 && poll <= maxPolls; poll += 1) {
    pendingNames = await findStillRunning({ railwayGateway, environmentId, serviceNames: pendingNames });
    if (pendingNames.size === 0 || poll === maxPolls) break;
    await sleep(INFRA_DATABASE_POLL_INTERVAL_SECONDS * MILLISECONDS_PER_SECOND);
    await onProgress();
  }

  return pendingNames;
}

async function findStillRunning(params: FindStillRunningParams): Promise<ReadonlySet<string>> {
  // Leitura que falha uma vez nao confirma a parada: conta como "ainda rodando" e tenta na proxima rodada.
  const services = await (async () => params.railwayGateway.getEnvironmentServices({ environmentId: params.environmentId }))()
    .catch(() => undefined);
  if (services === undefined) return params.serviceNames;

  // Servico ausente da leitura nao esta executando: so reprova quem aparece e ainda nao parou.
  const stillRunningNames = new Set(
    services.filter((service) => !isFullyStopped(service)).map((service) => service.serviceName),
  );
  return new Set([...params.serviceNames].filter((serviceName) => stillRunningNames.has(serviceName)));
}
