/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import {
  INFRA_DATABASE_POLL_INTERVAL_SECONDS,
  INFRA_POWER_DIRECTION,
  INFRA_SERVICE_OUTCOME,
  INFRA_SERVICE_POWER_STATE,
} from '@/modules/infra/infra.constant';
import { isDatabaseService } from '@/modules/infra/isDatabaseService';
import { orderServicesForPower } from '@/modules/infra/orderServicesForPower';
import { resolveServiceErrorCode } from '@/modules/infra/resolveServiceErrorCode';
import { resolveServicePowerState } from '@/modules/infra/resolveServicePowerState';
import type {
  InfraServiceResult,
  InfraSleep,
  RailwayServiceInstance,
  RunPowerOperationParams,
} from '@/modules/infra/types/infra.types';
import type { RailwayGatewayInterface } from '@/modules/infra/types/railwayGateway.interface';
import { ERROR_CODES } from '@/shared/errors/codes';

type Dependencies = {
  readonly railwayGateway: RailwayGatewayInterface;
  readonly sleep: InfraSleep;
  readonly databaseWaitSeconds: number;
};

type ServiceHandler = (service: RailwayServiceInstance) => Promise<InfraServiceResult>;

type PowerContext = {
  readonly databases: readonly RailwayServiceInstance[];
  readonly applications: readonly RailwayServiceInstance[];
  readonly params: RunPowerOperationParams;
};

type RunGroupParams = {
  readonly services: readonly RailwayServiceInstance[];
  readonly handler: ServiceHandler;
  readonly onProgress: () => Promise<void>;
};

type StartServiceParams = {
  readonly service: RailwayServiceInstance;
  readonly environmentId: string;
};

type WaitForDatabasesParams = {
  readonly environmentId: string;
  readonly serviceNames: readonly string[];
  readonly onProgress: () => Promise<void>;
};

const MILLISECONDS_PER_SECOND = 1000;

function buildResult(service: RailwayServiceInstance, outcome: InfraServiceResult['outcome']): InfraServiceResult {
  return { serviceName: service.serviceName, outcome };
}

/**
 * Percorre os servicos de um ambiente na ordem segura e devolve o resultado de cada um.
 *
 * Falha em um servico vira resultado `failed` e nunca interrompe os demais do grupo. "Pronto" e
 * `resolveServicePowerState === RUNNING`: o status SUCCESS sozinho tambem descreve um deployment parado.
 * `onProgress` nao pode lancar (o chamador o torna seguro): ele renova a trava depois de cada servico.
 */
export class RunPowerOperation {
  constructor(private readonly dependencies: Dependencies) {}

  async execute(params: RunPowerOperationParams): Promise<readonly InfraServiceResult[]> {
    const { ordered } = orderServicesForPower({ services: params.services, direction: params.direction });
    const context: PowerContext = {
      databases: ordered.filter(isDatabaseService),
      applications: ordered.filter((service) => !isDatabaseService(service)),
      params,
    };

    if (params.direction === INFRA_POWER_DIRECTION.OFF) return this.powerOff(context);
    return this.powerOn(context);
  }

  private async powerOff(context: PowerContext): Promise<readonly InfraServiceResult[]> {
    const { databases, applications, params } = context;
    const handler: ServiceHandler = (service) => this.stopService(service);
    const applicationResults = await this.runGroup({ services: applications, handler, onProgress: params.onProgress });
    const databaseResults = await this.runGroup({ services: databases, handler, onProgress: params.onProgress });
    return [...applicationResults, ...databaseResults];
  }

  private async powerOn(context: PowerContext): Promise<readonly InfraServiceResult[]> {
    const { databases, applications, params } = context;
    const handler: ServiceHandler = (service) => this.startService({ service, environmentId: params.environmentId });
    const startedDatabases = await this.runGroup({ services: databases, handler, onProgress: params.onProgress });

    const notReadyNames = await this.waitForDatabases({
      environmentId: params.environmentId,
      serviceNames: startedDatabases
        .filter((result) => result.outcome !== INFRA_SERVICE_OUTCOME.FAILED)
        .map((result) => result.serviceName),
      onProgress: params.onProgress,
    });
    const databaseResults: InfraServiceResult[] = startedDatabases.map((result) =>
      notReadyNames.has(result.serviceName)
        ? {
            serviceName: result.serviceName,
            outcome: INFRA_SERVICE_OUTCOME.FAILED,
            errorCode: ERROR_CODES.infra.INFRA_DATABASE_NOT_READY,
          }
        : result,
    );

    // Aplicacao sem banco sobe quebrada e pode gravar estado inconsistente: fica parada.
    const isDatabaseLayerHealthy = databaseResults.every((result) => result.outcome !== INFRA_SERVICE_OUTCOME.FAILED);
    const applicationResults = isDatabaseLayerHealthy
      ? await this.runGroup({ services: applications, handler, onProgress: params.onProgress })
      : applications.map((service) => buildResult(service, INFRA_SERVICE_OUTCOME.SKIPPED));

    return [...databaseResults, ...applicationResults];
  }

  private async runGroup(params: RunGroupParams): Promise<InfraServiceResult[]> {
    const { services, handler, onProgress } = params;
    const settled = await Promise.allSettled(
      services.map(async (service) => {
        try {
          return await handler(service);
        } finally {
          await onProgress();
        }
      }),
    );

    return settled.map((outcome, index) => {
      if (outcome.status === 'fulfilled') return outcome.value;
      return {
        serviceName: services[index]?.serviceName ?? '',
        outcome: INFRA_SERVICE_OUTCOME.FAILED,
        errorCode: resolveServiceErrorCode(outcome.reason),
      };
    });
  }

  private async stopService(service: RailwayServiceInstance): Promise<InfraServiceResult> {
    const state = resolveServicePowerState(service);
    const isAlreadyOff =
      state === INFRA_SERVICE_POWER_STATE.STOPPED || state === INFRA_SERVICE_POWER_STATE.NO_DEPLOYMENT;
    if (isAlreadyOff || service.latestDeploymentId === undefined) {
      return buildResult(service, INFRA_SERVICE_OUTCOME.SKIPPED);
    }

    await this.dependencies.railwayGateway.stopDeployment({ deploymentId: service.latestDeploymentId });
    return buildResult(service, INFRA_SERVICE_OUTCOME.OK);
  }

  private async startService(params: StartServiceParams): Promise<InfraServiceResult> {
    const { service, environmentId } = params;
    const { railwayGateway } = this.dependencies;
    const state = resolveServicePowerState(service);

    // Um servico que ja esta subindo nao leva segundo comando: a espera dos bancos cobre o resto.
    if (state === INFRA_SERVICE_POWER_STATE.RUNNING || state === INFRA_SERVICE_POWER_STATE.TRANSITIONING) {
      return buildResult(service, INFRA_SERVICE_OUTCOME.SKIPPED);
    }
    if (state === INFRA_SERVICE_POWER_STATE.STOPPED && service.latestDeploymentId !== undefined) {
      await railwayGateway.restartDeployment({ deploymentId: service.latestDeploymentId });
      return buildResult(service, INFRA_SERVICE_OUTCOME.OK);
    }

    await railwayGateway.redeployService({ environmentId, serviceId: service.serviceId });
    return buildResult(service, INFRA_SERVICE_OUTCOME.OK);
  }

  /** Devolve os bancos que nao ficaram RUNNING no prazo; a espera e uma consulta de estado a cada 5 s. */
  private async waitForDatabases(params: WaitForDatabasesParams): Promise<ReadonlySet<string>> {
    const { environmentId, serviceNames, onProgress } = params;
    const { sleep, databaseWaitSeconds } = this.dependencies;
    const maxPolls = Math.floor(databaseWaitSeconds / INFRA_DATABASE_POLL_INTERVAL_SECONDS);
    let pendingNames: ReadonlySet<string> = new Set(serviceNames);

    // Sequencial por natureza: cada consulta depende de a anterior ter dito que ainda nao esta pronto.
    for (let poll = 0; pendingNames.size > 0 && poll <= maxPolls; poll += 1) {
      pendingNames = await this.findNotRunning({ environmentId, serviceNames: pendingNames });
      if (pendingNames.size === 0 || poll === maxPolls) break;
      await sleep(INFRA_DATABASE_POLL_INTERVAL_SECONDS * MILLISECONDS_PER_SECOND);
      await onProgress();
    }

    return pendingNames;
  }

  private async findNotRunning(params: {
    readonly environmentId: string;
    readonly serviceNames: ReadonlySet<string>;
  }): Promise<ReadonlySet<string>> {
    // Leitura que falha uma vez nao reprova o banco: conta como "ainda nao pronto" e tenta na proxima rodada.
    const services = await this.dependencies.railwayGateway
      .getEnvironmentServices({ environmentId: params.environmentId })
      .catch(() => undefined);
    if (services === undefined) return params.serviceNames;

    const runningNames = new Set(
      services
        .filter((service) => resolveServicePowerState(service) === INFRA_SERVICE_POWER_STATE.RUNNING)
        .map((service) => service.serviceName),
    );
    return new Set([...params.serviceNames].filter((serviceName) => !runningNames.has(serviceName)));
  }
}
