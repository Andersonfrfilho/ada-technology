/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { InfraNotConfiguredError } from '@/modules/infra/infra.error';
import { ListInfraEnvironmentsUseCase } from '@/modules/infra/listInfraEnvironments.use-case';
import type { InfraAccessStatus } from '@/modules/infra/infra.constant';
import type {
  InfraOperationRecord,
  InfraScheduleRecord,
  RailwayProject,
  RailwayServiceInstance,
} from '@/modules/infra/types/infra.types';
import type { InfraCacheInterface } from '@/modules/infra/types/infraCache.interface';
import type { InfraOperationRepositoryInterface } from '@/modules/infra/types/infraOperationRepository.interface';
import type { InfraScheduleRepositoryInterface } from '@/modules/infra/types/infraScheduleRepository.interface';
import type { RailwayGatewayInterface } from '@/modules/infra/types/railwayGateway.interface';

function buildService(overrides: Partial<RailwayServiceInstance> = {}): RailwayServiceInstance {
  return {
    serviceId: 'svc-1',
    serviceName: 'api',
    hasDeployment: true,
    isStopped: false,
    instanceStatus: 'RUNNING',
    ...overrides,
  };
}

function buildProject(params: {
  readonly name: string;
  readonly environments: readonly { id: string; name: string; services: RailwayServiceInstance[] }[];
}): RailwayProject {
  return { id: `project-${params.name}`, name: params.name, environments: params.environments };
}

function buildSchedule(environmentId: string): InfraScheduleRecord {
  const now = new Date('2026-01-01T00:00:00Z');
  return {
    id: 'schedule-1',
    railwayProjectId: 'project-a',
    railwayEnvironmentId: environmentId,
    activeWeekdays: [1, 2, 3],
    powerOnTime: '08:00',
    powerOffTime: '20:00',
    timezone: 'America/Sao_Paulo',
    isEnabled: true,
    keepOnUntil: null,
    lastEvaluatedAt: null,
    lastPowerOffAt: null,
    lastPowerOnAt: null,
    updatedByAgentId: null,
    createdAt: now,
    updatedAt: now,
  };
}

function buildOperation(environmentId: string): InfraOperationRecord {
  return {
    id: 'operation-1',
    railwayProjectId: 'project-a',
    railwayEnvironmentId: environmentId,
    kind: 'power_off',
    status: 'running',
    trigger: 'manual',
    actorAgentId: null,
    serviceResults: [],
    startedAt: new Date('2026-01-01T00:00:00Z'),
    finishedAt: null,
  };
}

type Harness = {
  readonly useCase: ListInfraEnvironmentsUseCase;
  readonly counters: { inventory: number; access: number; schedules: number; operations: number };
  readonly schedules: InfraScheduleRecord[];
  readonly operations: InfraOperationRecord[];
};

function buildHarness(params: {
  readonly projects: readonly RailwayProject[];
  readonly access?: InfraAccessStatus;
  readonly isConfigured?: boolean;
  readonly hasSchedulesFailure?: boolean;
}): Harness {
  const counters = { inventory: 0, access: 0, schedules: 0, operations: 0 };
  const schedules: InfraScheduleRecord[] = [];
  const operations: InfraOperationRecord[] = [];
  const store = new Map<string, string>();

  const gateway: RailwayGatewayInterface = {
    async listInventory() {
      counters.inventory += 1;
      return params.projects;
    },
    async verifyAccess() {
      counters.access += 1;
      return params.access ?? 'ok';
    },
    async stopDeployment() {},
    async restartDeployment() {},
    async redeployService() {},
    async getBillingCycle() {
      throw new Error('not used');
    },
    async getUsage() {
      return [];
    },
    async getEstimatedUsage() {
      return [];
    },
  };

  const cache: InfraCacheInterface = {
    async get(key) {
      return store.get(key) ?? null;
    },
    async set(key, value) {
      store.set(key, value);
    },
    async delete(key) {
      store.delete(key);
    },
  };

  const operationRepository: InfraOperationRepositoryInterface = {
    async create() {
      throw new Error('not used');
    },
    async findById() {
      return undefined;
    },
    async findRunningByEnvironmentId(environmentId) {
      counters.operations += 1;
      return operations.find((operation) => operation.railwayEnvironmentId === environmentId);
    },
    async finishOperation() {},
    async markStaleRunningAsInterrupted() {
      return 0;
    },
  };

  const scheduleRepository: InfraScheduleRepositoryInterface = {
    async findByEnvironmentId() {
      return undefined;
    },
    async listAll() {
      counters.schedules += 1;
      if (params.hasSchedulesFailure) throw new Error('database down');
      return schedules;
    },
    async upsert() {
      throw new Error('not used');
    },
  };

  const useCase = new ListInfraEnvironmentsUseCase({
    ...(params.isConfigured === false ? {} : { railwayGateway: gateway }),
    cache,
    operationRepository,
    scheduleRepository,
    managedPattern: 'staging',
    selfEnvironmentId: 'env-self',
  });

  return { useCase, counters, schedules, operations };
}

function singleEnvironment(services: RailwayServiceInstance[], name = 'staging'): RailwayProject[] {
  return [buildProject({ name: 'app', environments: [{ id: 'env-1', name, services }] })];
}

async function stateOf(services: RailwayServiceInstance[]): Promise<string | undefined> {
  const { useCase } = buildHarness({ projects: singleEnvironment(services) });
  const result = await useCase.execute();
  return result.projects[0]?.environments[0]?.state;
}

describe('ListInfraEnvironmentsUseCase', () => {
  it('throws InfraNotConfiguredError when the gateway is missing', async () => {
    const { useCase } = buildHarness({ projects: [], isConfigured: false });
    await expect(useCase.execute()).rejects.toBeInstanceOf(InfraNotConfiguredError);
  });

  it('classifies staging as managed, production as protected and the own environment as protected', async () => {
    const projects = [
      buildProject({
        name: 'app',
        environments: [
          { id: 'env-1', name: 'staging', services: [] },
          { id: 'env-2', name: 'production', services: [] },
          { id: 'env-self', name: 'internal', services: [] },
        ],
      }),
    ];
    const { useCase } = buildHarness({ projects });
    const result = await useCase.execute();
    const classifications = Object.fromEntries(
      (result.projects[0]?.environments ?? []).map((environment) => [environment.environmentName, environment.classification]),
    );
    expect(classifications).toEqual({ internal: 'protected', production: 'protected', staging: 'managed' });
  });

  it('marks the environment as running when every service is running', async () => {
    expect(await stateOf([buildService(), buildService({ serviceName: 'worker' })])).toBe('running');
  });

  it('counts a stopped deployment with SUCCESS status as stopped', async () => {
    const stopped = buildService({ isStopped: true, instanceStatus: 'SUCCESS' });
    expect(await stateOf([stopped, buildService({ serviceName: 'db', hasDeployment: false })])).toBe('stopped');
  });

  it('marks the environment as partial when running and stopped services are mixed', async () => {
    expect(await stateOf([buildService(), buildService({ serviceName: 'worker', isStopped: true })])).toBe('partial');
  });

  it('marks the environment as transitioning when any service is transitioning', async () => {
    expect(await stateOf([buildService(), buildService({ serviceName: 'worker', instanceStatus: 'DEPLOYING' })])).toBe(
      'transitioning',
    );
  });

  it('treats an environment without services as stopped', async () => {
    expect(await stateOf([])).toBe('stopped');
  });

  it('flags database services and exposes the service power state', async () => {
    const { useCase } = buildHarness({
      projects: singleEnvironment([buildService(), buildService({ serviceName: 'Postgres', sourceImage: 'postgres:16' })]),
    });
    const result = await useCase.execute();
    expect(result.projects[0]?.environments[0]?.services).toEqual([
      { serviceName: 'api', isDatabase: false, powerState: 'running' },
      { serviceName: 'Postgres', isDatabase: true, powerState: 'running' },
    ]);
  });

  it('returns no projects and skips the inventory when the token is invalid', async () => {
    const { useCase, counters } = buildHarness({ projects: singleEnvironment([buildService()]), access: 'token_invalid' });
    const result = await useCase.execute();
    expect(result).toEqual({ access: 'token_invalid', projects: [] });
    expect(counters.inventory).toBe(0);
  });

  it('serves the inventory and access from cache but rereads schedules and operations', async () => {
    const harness = buildHarness({ projects: singleEnvironment([buildService()]) });
    await harness.useCase.execute();
    harness.schedules.push(buildSchedule('env-1'));
    harness.operations.push(buildOperation('env-1'));
    const second = await harness.useCase.execute();

    expect(harness.counters.inventory).toBe(1);
    expect(harness.counters.access).toBe(1);
    expect(harness.counters.schedules).toBe(2);
    expect(harness.counters.operations).toBe(2);
    expect(second.projects[0]?.environments[0]?.runningOperationId).toBe('operation-1');
    expect(second.projects[0]?.environments[0]?.schedule?.powerOnTime).toBe('08:00');
  });

  it('attaches schedule and running operation only to the matching environment', async () => {
    const projects = [
      buildProject({
        name: 'app',
        environments: [
          { id: 'env-1', name: 'staging', services: [] },
          { id: 'env-3', name: 'dev', services: [] },
        ],
      }),
    ];
    const harness = buildHarness({ projects });
    harness.schedules.push(buildSchedule('env-1'));
    harness.operations.push(buildOperation('env-1'));
    const result = await harness.useCase.execute();
    const [dev, staging] = result.projects[0]?.environments ?? [];

    expect(staging?.schedule?.railwayEnvironmentId).toBe('env-1');
    expect(staging?.runningOperationId).toBe('operation-1');
    expect(dev?.schedule).toBeUndefined();
    expect(dev?.runningOperationId).toBeUndefined();
  });

  it('propagates repository failures instead of swallowing them', async () => {
    const { useCase } = buildHarness({ projects: singleEnvironment([buildService()]), hasSchedulesFailure: true });
    await expect(useCase.execute()).rejects.toThrow('database down');
  });

  it('orders projects and environments by name', async () => {
    const projects = [
      buildProject({ name: 'zeta', environments: [{ id: 'z1', name: 'staging', services: [] }] }),
      buildProject({
        name: 'alpha',
        environments: [
          { id: 'a2', name: 'staging', services: [] },
          { id: 'a1', name: 'dev', services: [] },
        ],
      }),
    ];
    const { useCase } = buildHarness({ projects });
    const result = await useCase.execute();
    expect(result.projects.map((project) => project.projectName)).toEqual(['alpha', 'zeta']);
    expect(result.projects[0]?.environments.map((environment) => environment.environmentName)).toEqual(['dev', 'staging']);
  });
});
