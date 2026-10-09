/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { RecordAuditLogParams } from '@/modules/audit/types/audit.types';
import type {
  CreateInfraOperationParams,
  FinishInfraOperationParams,
  InfraOperationRecord,
  InfraScheduleRecord,
  InfraSleep,
  MarkStaleRunningAsInterruptedParams,
  RailwayProject,
  RailwayServiceInstance,
  RecordScheduleEvaluationParams,
  SetIfAbsentParams,
  SetKeepOnUntilParams,
  UpsertInfraScheduleParams,
} from '@/modules/infra/types/infra.types';
import type { PowerEnvironmentDependencies } from '@/modules/infra/powerEnvironment.use-case';
import type { InfraCacheInterface } from '@/modules/infra/types/infraCache.interface';
import type { InfraOperationRepositoryInterface } from '@/modules/infra/types/infraOperationRepository.interface';
import type { InfraScheduleRepositoryInterface } from '@/modules/infra/types/infraScheduleRepository.interface';
import type { RailwayGatewayInterface } from '@/modules/infra/types/railwayGateway.interface';

/** Fakes em memoria dos testes de operacao de energia. O gateway registra TODA mutation em `events`. */

export type ServiceShape = 'running' | 'stopped' | 'none';

export function buildService(params: {
  readonly name: string;
  readonly shape?: ServiceShape;
  readonly image?: string;
}): RailwayServiceInstance {
  const shape = params.shape ?? 'running';
  return {
    serviceId: `svc-${params.name}`,
    serviceName: params.name,
    ...(params.image ? { sourceImage: params.image } : {}),
    ...(shape === 'none' ? {} : { latestDeploymentId: `dep-${params.name}` }),
    hasDeployment: shape !== 'none',
    isStopped: shape === 'stopped',
    ...(shape === 'none' ? {} : { instanceStatus: shape === 'running' ? 'RUNNING' : 'EXITED' }),
  };
}

export function buildProject(params: {
  readonly environmentId: string;
  readonly environmentName: string;
  readonly services: readonly RailwayServiceInstance[];
}): RailwayProject {
  return {
    id: 'project-1',
    name: 'ada',
    environments: [{ id: params.environmentId, name: params.environmentName, services: params.services }],
  };
}

export type FakeGateway = RailwayGatewayInterface & {
  readonly events: string[];
  inventoryReads: number;
  environmentReads: number;
};

export type FakeGatewayOptions = {
  readonly projects: readonly RailwayProject[];
  /** Estado devolvido na n-esima leitura do ambiente (1-based). */
  readonly environmentServices?: (readNumber: number) => readonly RailwayServiceInstance[];
  /** Devolve um erro para fazer a mutation `stop:dep-x`/`restart:dep-x`/`redeploy:env/svc` lancar. */
  readonly failMutation?: (mutation: string) => Error | undefined;
  /** Segura as mutations ate a promise resolver. */
  readonly gate?: Promise<void>;
};

export function buildFakeGateway(options: FakeGatewayOptions): FakeGateway {
  const events: string[] = [];
  const fake = { events, inventoryReads: 0, environmentReads: 0 };

  async function mutate(mutation: string): Promise<void> {
    events.push(mutation);
    if (options.gate) await options.gate;
    const failure = options.failMutation?.(mutation);
    if (failure) throw failure;
  }

  return Object.assign(fake, {
    async listInventory() {
      fake.inventoryReads += 1;
      return options.projects;
    },
    async getEnvironmentServices() {
      fake.environmentReads += 1;
      events.push('read');
      const provider = options.environmentServices;
      return provider ? provider(fake.environmentReads) : [];
    },
    stopDeployment: ({ deploymentId }: { deploymentId: string }) => mutate(`stop:${deploymentId}`),
    restartDeployment: ({ deploymentId }: { deploymentId: string }) => mutate(`restart:${deploymentId}`),
    redeployService: ({ environmentId, serviceId }: { environmentId: string; serviceId: string }) =>
      mutate(`redeploy:${environmentId}/${serviceId}`),
    async getBillingCycle() {
      throw new Error('not used');
    },
    async getUsage() {
      return [];
    },
    async getEstimatedUsage() {
      return [];
    },
    async verifyAccess() {
      return 'ok' as const;
    },
  });
}

export class FakeInfraCache implements InfraCacheInterface {
  readonly store = new Map<string, string>();
  readonly setIfAbsentCalls: SetIfAbsentParams[] = [];
  readonly setCalls: { readonly key: string; readonly ttlSeconds: number | undefined }[] = [];
  readonly deletedKeys: string[] = [];

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.setCalls.push({ key, ttlSeconds });
    this.store.set(key, value);
  }

  async setIfAbsent(params: SetIfAbsentParams): Promise<boolean> {
    this.setIfAbsentCalls.push(params);
    if (this.store.has(params.key)) return false;
    this.store.set(params.key, params.value);
    return true;
  }

  async delete(key: string): Promise<void> {
    this.deletedKeys.push(key);
    this.store.delete(key);
  }
}

export class FakeOperationRepository implements InfraOperationRepositoryInterface {
  readonly operations: InfraOperationRecord[] = [];
  readonly staleCalls: MarkStaleRunningAsInterruptedParams[] = [];
  staleResult = 0;
  /** Quantas chamadas de `finishOperation` ainda devem lancar. */
  finishFailures = 0;

  async create(params: CreateInfraOperationParams): Promise<InfraOperationRecord> {
    const record: InfraOperationRecord = {
      id: `operation-${this.operations.length + 1}`,
      railwayProjectId: params.railwayProjectId,
      railwayEnvironmentId: params.railwayEnvironmentId,
      kind: params.kind,
      status: 'running',
      trigger: params.trigger,
      actorAgentId: params.actorAgentId ?? null,
      serviceResults: [],
      startedAt: new Date('2026-01-01T00:00:00Z'),
      finishedAt: null,
    };
    this.operations.push(record);
    return record;
  }

  async findById(id: string): Promise<InfraOperationRecord | undefined> {
    return this.operations.find((operation) => operation.id === id);
  }

  async findRunningByEnvironmentId(environmentId: string): Promise<InfraOperationRecord | undefined> {
    return this.operations.find(
      (operation) => operation.railwayEnvironmentId === environmentId && operation.status === 'running',
    );
  }

  async finishOperation(params: FinishInfraOperationParams): Promise<void> {
    if (this.finishFailures > 0) {
      this.finishFailures -= 1;
      throw new Error('database down');
    }
    const index = this.operations.findIndex((operation) => operation.id === params.id);
    const current = this.operations[index];
    if (!current) return;
    this.operations[index] = {
      ...current,
      status: params.status,
      serviceResults: params.serviceResults,
      finishedAt: params.finishedAt,
    };
  }

  async markStaleRunningAsInterrupted(params: MarkStaleRunningAsInterruptedParams): Promise<number> {
    this.staleCalls.push(params);
    return this.staleResult;
  }
}

export const FAKE_NOW = new Date('2026-10-09T12:00:00Z');

export class FakeScheduleRepository implements InfraScheduleRepositoryInterface {
  readonly records = new Map<string, InfraScheduleRecord>();
  readonly upsertCalls: UpsertInfraScheduleParams[] = [];
  readonly keepOnUntilCalls: SetKeepOnUntilParams[] = [];
  readonly evaluationCalls: RecordScheduleEvaluationParams[] = [];

  seed(record: InfraScheduleRecord): void {
    this.records.set(record.railwayEnvironmentId, record);
  }

  async findByEnvironmentId(environmentId: string): Promise<InfraScheduleRecord | undefined> {
    return this.records.get(environmentId);
  }

  async listAll(): Promise<readonly InfraScheduleRecord[]> {
    return [...this.records.values()];
  }

  async upsert(params: UpsertInfraScheduleParams): Promise<InfraScheduleRecord> {
    this.upsertCalls.push(params);
    const existing = this.records.get(params.railwayEnvironmentId);
    const record: InfraScheduleRecord = {
      id: existing?.id ?? `schedule-${this.records.size + 1}`,
      railwayProjectId: params.railwayProjectId,
      railwayEnvironmentId: params.railwayEnvironmentId,
      activeWeekdays: [...params.activeWeekdays],
      powerOnTime: params.powerOnTime,
      powerOffTime: params.powerOffTime,
      timezone: existing?.timezone ?? 'America/Sao_Paulo',
      isEnabled: params.isEnabled,
      keepOnUntil: existing?.keepOnUntil ?? null,
      lastEvaluatedAt: existing?.lastEvaluatedAt ?? null,
      lastPowerOffAt: existing?.lastPowerOffAt ?? null,
      lastPowerOnAt: existing?.lastPowerOnAt ?? null,
      updatedByAgentId: params.updatedByAgentId ?? existing?.updatedByAgentId ?? null,
      createdAt: existing?.createdAt ?? FAKE_NOW,
      updatedAt: FAKE_NOW,
    };
    this.records.set(params.railwayEnvironmentId, record);
    return record;
  }

  async recordEvaluation(params: RecordScheduleEvaluationParams): Promise<void> {
    this.evaluationCalls.push(params);
    const current = this.records.get(params.environmentId);
    if (!current) return;
    this.records.set(params.environmentId, {
      ...current,
      lastEvaluatedAt: params.lastEvaluatedAt,
      ...(params.keepOnUntil !== undefined ? { keepOnUntil: params.keepOnUntil } : {}),
      ...(params.lastPowerOnAt ? { lastPowerOnAt: params.lastPowerOnAt } : {}),
      ...(params.lastPowerOffAt ? { lastPowerOffAt: params.lastPowerOffAt } : {}),
    });
  }

  async setKeepOnUntil(params: SetKeepOnUntilParams): Promise<void> {
    this.keepOnUntilCalls.push(params);
    const current = this.records.get(params.environmentId);
    if (!current) return;
    this.records.set(params.environmentId, { ...current, keepOnUntil: params.keepOnUntil });
  }
}

export type PowerHarness = {
  readonly dependencies: PowerEnvironmentDependencies;
  readonly gateway: FakeGateway;
  readonly cache: FakeInfraCache;
  readonly repository: FakeOperationRepository;
  readonly scheduleRepository: FakeScheduleRepository;
  readonly auditCalls: RecordAuditLogParams[];
  readonly logMessages: string[];
  readonly sleeps: number[];
  failAudit: boolean;
};

export function buildPowerHarness(params: {
  readonly gatewayOptions: FakeGatewayOptions;
  readonly databaseWaitSeconds?: number;
  readonly isConfigured?: boolean;
  readonly now?: Date;
}): PowerHarness {
  const gateway = buildFakeGateway(params.gatewayOptions);
  const cache = new FakeInfraCache();
  const repository = new FakeOperationRepository();
  const scheduleRepository = new FakeScheduleRepository();
  const auditCalls: RecordAuditLogParams[] = [];
  const logMessages: string[] = [];
  const sleeps: number[] = [];

  const harness: PowerHarness = {
    gateway,
    cache,
    repository,
    scheduleRepository,
    auditCalls,
    logMessages,
    sleeps,
    failAudit: false,
    dependencies: {
      ...(params.isConfigured === false ? {} : { railwayGateway: gateway }),
      cache,
      operationRepository: repository,
      scheduleRepository,
      recordAudit: {
        execute: async (auditParams) => {
          if (harness.failAudit) throw new Error('audit down');
          auditCalls.push(auditParams);
        },
      },
      logger: {
        info: (message) => void logMessages.push(message),
        error: (message) => void logMessages.push(message),
      },
      sleep: (async (milliseconds: number) => {
        sleeps.push(milliseconds);
      }) as InfraSleep,
      managedPattern: 'staging',
      selfEnvironmentId: 'env-self',
      databaseWaitSeconds: params.databaseWaitSeconds ?? 120,
      now: () => params.now ?? FAKE_NOW,
    },
  };

  return harness;
}
