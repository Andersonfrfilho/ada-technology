/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import {
  INFRA_ACCESS_CACHE_KEY,
  INFRA_ACCESS_CACHE_TTL_SECONDS,
  INFRA_ACCESS_STATUS,
  INFRA_ENVIRONMENT_POWER_STATE,
  INFRA_ENVIRONMENTS_CACHE_TTL_SECONDS,
  INFRA_INVENTORY_CACHE_KEY,
  INFRA_SERVICE_POWER_STATE,
  type InfraAccessStatus,
  type InfraEnvironmentPowerState,
} from '@/modules/infra/infra.constant';
import { InfraNotConfiguredError } from '@/modules/infra/infra.error';
import { infraInventoryCacheSchema } from '@/modules/infra/infraInventory.schema';
import { classifyEnvironment } from '@/modules/infra/classifyEnvironment';
import { isDatabaseService } from '@/modules/infra/isDatabaseService';
import { resolveServicePowerState } from '@/modules/infra/resolveServicePowerState';
import type { InfraCacheInterface } from '@/modules/infra/types/infraCache.interface';
import type {
  InfraEnvironmentView,
  InfraProjectView,
  InfraScheduleRecord,
  InfraServiceView,
  ListInfraEnvironmentsResult,
  RailwayEnvironment,
  RailwayProject,
} from '@/modules/infra/types/infra.types';
import type { InfraOperationRepositoryInterface } from '@/modules/infra/types/infraOperationRepository.interface';
import type { InfraScheduleRepositoryInterface } from '@/modules/infra/types/infraScheduleRepository.interface';
import type { RailwayGatewayInterface } from '@/modules/infra/types/railwayGateway.interface';

type Dependencies = {
  readonly railwayGateway?: RailwayGatewayInterface;
  readonly cache: InfraCacheInterface;
  readonly operationRepository: InfraOperationRepositoryInterface;
  readonly scheduleRepository: InfraScheduleRepositoryInterface;
  readonly managedPattern: string;
  readonly selfEnvironmentId: string;
};

const ACCESS_STATUSES = Object.values(INFRA_ACCESS_STATUS) as readonly string[];

function isAccessStatus(value: string | null): value is InfraAccessStatus {
  return value !== null && ACCESS_STATUSES.includes(value);
}

function aggregatePowerState(services: readonly InfraServiceView[]): InfraEnvironmentPowerState {
  if (services.length === 0) return INFRA_ENVIRONMENT_POWER_STATE.STOPPED;
  if (services.some((service) => service.powerState === INFRA_SERVICE_POWER_STATE.TRANSITIONING)) {
    return INFRA_ENVIRONMENT_POWER_STATE.TRANSITIONING;
  }
  if (services.every((service) => service.powerState === INFRA_SERVICE_POWER_STATE.RUNNING)) {
    return INFRA_ENVIRONMENT_POWER_STATE.RUNNING;
  }
  const isAllOff = services.every(
    (service) =>
      service.powerState === INFRA_SERVICE_POWER_STATE.STOPPED ||
      service.powerState === INFRA_SERVICE_POWER_STATE.NO_DEPLOYMENT,
  );
  return isAllOff ? INFRA_ENVIRONMENT_POWER_STATE.STOPPED : INFRA_ENVIRONMENT_POWER_STATE.PARTIAL;
}

function byName<TItem>(getName: (item: TItem) => string): (left: TItem, right: TItem) => number {
  return (left, right) => getName(left).localeCompare(getName(right));
}

/**
 * Estado de energia vem do Railway (cache curto); agenda e operacao em andamento vem do banco e nunca
 * entram no cache, porque mudam por acao do usuario e a tela precisa refletir na hora.
 */
export class ListInfraEnvironmentsUseCase {
  constructor(private readonly dependencies: Dependencies) {}

  async execute(): Promise<ListInfraEnvironmentsResult> {
    const { railwayGateway } = this.dependencies;
    if (!railwayGateway) throw new InfraNotConfiguredError();

    const access = await this.resolveAccess(railwayGateway);
    if (access === INFRA_ACCESS_STATUS.TOKEN_INVALID) return { access, projects: [] };

    const inventory = await this.resolveInventory(railwayGateway);
    const schedulesByEnvironmentId = await this.indexSchedules();

    const projects = await Promise.all(
      [...inventory]
        .sort(byName((project) => project.name))
        .map((project) => this.buildProjectView({ project, schedulesByEnvironmentId })),
    );

    return { access, projects };
  }

  private async resolveAccess(railwayGateway: RailwayGatewayInterface): Promise<InfraAccessStatus> {
    const { cache } = this.dependencies;
    const cached = await cache.get(INFRA_ACCESS_CACHE_KEY);
    if (isAccessStatus(cached)) return cached;

    const access = await railwayGateway.verifyAccess();
    await cache.set(INFRA_ACCESS_CACHE_KEY, access, INFRA_ACCESS_CACHE_TTL_SECONDS);
    return access;
  }

  private async resolveInventory(railwayGateway: RailwayGatewayInterface): Promise<readonly RailwayProject[]> {
    const { cache } = this.dependencies;
    const cached = await cache.get(INFRA_INVENTORY_CACHE_KEY);
    if (cached !== null) {
      const parsed = infraInventoryCacheSchema.safeParse(JSON.parse(cached));
      if (parsed.success) return parsed.data as readonly RailwayProject[];
    }

    const inventory = await railwayGateway.listInventory();
    await cache.set(INFRA_INVENTORY_CACHE_KEY, JSON.stringify(inventory), INFRA_ENVIRONMENTS_CACHE_TTL_SECONDS);
    return inventory;
  }

  private async indexSchedules(): Promise<ReadonlyMap<string, InfraScheduleRecord>> {
    const schedules = await this.dependencies.scheduleRepository.listAll();
    return new Map(schedules.map((schedule) => [schedule.railwayEnvironmentId, schedule]));
  }

  private async buildProjectView(params: {
    readonly project: RailwayProject;
    readonly schedulesByEnvironmentId: ReadonlyMap<string, InfraScheduleRecord>;
  }): Promise<InfraProjectView> {
    const { project, schedulesByEnvironmentId } = params;
    const environments = await Promise.all(
      [...project.environments]
        .sort(byName((environment) => environment.name))
        .map((environment) =>
          this.buildEnvironmentView({ environment, schedule: schedulesByEnvironmentId.get(environment.id) }),
        ),
    );

    return { projectId: project.id, projectName: project.name, environments };
  }

  private async buildEnvironmentView(params: {
    readonly environment: RailwayEnvironment;
    readonly schedule: InfraScheduleRecord | undefined;
  }): Promise<InfraEnvironmentView> {
    const { environment, schedule } = params;
    const { managedPattern, selfEnvironmentId, operationRepository } = this.dependencies;
    const runningOperation = await operationRepository.findRunningByEnvironmentId(environment.id);

    const services = environment.services.map((service) => ({
      serviceName: service.serviceName,
      isDatabase: isDatabaseService(service),
      powerState: resolveServicePowerState(service),
    }));

    return {
      environmentId: environment.id,
      environmentName: environment.name,
      classification: classifyEnvironment({
        environmentName: environment.name,
        environmentId: environment.id,
        managedPattern,
        selfEnvironmentId,
      }),
      state: aggregatePowerState(services),
      services,
      ...(schedule ? { schedule } : {}),
      ...(runningOperation ? { runningOperationId: runningOperation.id } : {}),
    };
  }
}
