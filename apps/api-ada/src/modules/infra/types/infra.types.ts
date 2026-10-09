/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { z } from 'zod';

import type { infraEnvironmentSchedules, infraPowerOperations } from '@/infra/database/schema/infra.schema';
import type { ActorType } from '@/modules/audit/audit.constant';
import type {
  InfraAccessStatus,
  InfraCostsWindowSource,
  InfraEnvironmentClassification,
  InfraEnvironmentPowerState,
  InfraOperationTrigger,
  InfraPowerDirection,
  InfraServiceOutcome,
  InfraServicePowerState,
} from '@/modules/infra/infra.constant';
import type { RailwayUsageMeasurement } from '@/modules/infra/railwayPricing.constant';

export type RailwayServiceInstance = {
  readonly serviceId: string;
  readonly serviceName: string;
  readonly sourceImage?: string;
  readonly latestDeploymentId?: string;
  readonly hasDeployment: boolean;
  readonly isStopped: boolean;
  readonly instanceStatus?: string;
};

export type RailwayEnvironment = {
  readonly id: string;
  readonly name: string;
  readonly services: readonly RailwayServiceInstance[];
};

export type RailwayProject = {
  readonly id: string;
  readonly name: string;
  readonly environments: readonly RailwayEnvironment[];
};

export type RailwayBillingCycle = {
  readonly start: string;
  readonly end: string;
  readonly currentUsage: number;
};

export type RailwayUsageRow = {
  readonly measurement: string;
  readonly value: number;
  readonly projectId: string;
  readonly environmentId: string;
};

export type RailwayEstimatedUsageRow = {
  readonly measurement: string;
  readonly estimatedValue: number;
  readonly projectId: string;
};

export type GetEnvironmentServicesParams = { readonly environmentId: string };
export type StopDeploymentParams = { readonly deploymentId: string };
export type RestartDeploymentParams = { readonly deploymentId: string };
export type RedeployServiceParams = { readonly environmentId: string; readonly serviceId: string };
export type GetUsageParams = { readonly startDate: string; readonly endDate: string };

export type RailwayGatewayDependencies = {
  readonly token: string;
  readonly workspaceId: string;
  readonly fetchImplementation?: typeof fetch;
};

export type ExecuteRailwayParams<TData> = {
  readonly operationName: string;
  readonly query: string;
  readonly variables: Readonly<Record<string, unknown>>;
  readonly schema: z.ZodType<TData>;
};

export type ClassifyEnvironmentParams = {
  readonly environmentName: string;
  readonly environmentId: string;
  readonly managedPattern: string;
  readonly selfEnvironmentId: string;
};
export type ClassifyEnvironmentResult = InfraEnvironmentClassification;

export type OrderServicesForPowerParams = {
  readonly services: readonly RailwayServiceInstance[];
  readonly direction: InfraPowerDirection;
};
export type OrderServicesForPowerResult = {
  readonly ordered: RailwayServiceInstance[];
};

export type CreateRailwayGatewayParams = {
  readonly token: string;
  readonly workspaceId: string;
};

export type InfraServiceResultOutcome = InfraServiceOutcome;
export type InfraServiceResult = {
  readonly serviceName: string;
  readonly outcome: InfraServiceResultOutcome;
  readonly errorCode?: string | undefined;
};

export type InfraOperationRow = typeof infraPowerOperations.$inferSelect;
export type InfraOperationRecord = Omit<InfraOperationRow, 'serviceResults'> & {
  readonly serviceResults: readonly InfraServiceResult[];
};
export type InfraScheduleRecord = typeof infraEnvironmentSchedules.$inferSelect;

export type CreateInfraOperationParams = {
  readonly railwayProjectId: string;
  readonly railwayEnvironmentId: string;
  readonly kind: string;
  readonly trigger: string;
  readonly actorAgentId?: string;
};
export type FinishInfraOperationParams = {
  readonly id: string;
  readonly status: string;
  readonly serviceResults: readonly InfraServiceResult[];
  readonly finishedAt: Date;
};
export type MarkStaleRunningAsInterruptedParams = { readonly olderThan: Date };

export type UpsertInfraScheduleParams = {
  readonly railwayProjectId: string;
  readonly railwayEnvironmentId: string;
  readonly activeWeekdays: readonly number[];
  readonly powerOnTime: string;
  readonly powerOffTime: string;
  readonly isEnabled: boolean;
  readonly updatedByAgentId?: string;
};

export type InfraServiceView = {
  readonly serviceName: string;
  readonly isDatabase: boolean;
  readonly powerState: InfraServicePowerState;
};

export type InfraEnvironmentView = {
  readonly environmentId: string;
  readonly environmentName: string;
  readonly classification: InfraEnvironmentClassification;
  readonly state: InfraEnvironmentPowerState;
  readonly services: readonly InfraServiceView[];
  readonly schedule?: InfraScheduleRecord;
  readonly runningOperationId?: string;
};

export type InfraProjectView = {
  readonly projectId: string;
  readonly projectName: string;
  readonly environments: readonly InfraEnvironmentView[];
};

export type ListInfraEnvironmentsResult = {
  readonly access: InfraAccessStatus;
  readonly projects: readonly InfraProjectView[];
};

export type GetInfraOperationParams = { readonly operationId: string };
export type GetInfraOperationResult = Pick<
  InfraOperationRecord,
  'id' | 'kind' | 'status' | 'trigger' | 'serviceResults' | 'startedAt' | 'finishedAt' | 'railwayEnvironmentId'
>;

export type PowerEnvironmentParams = {
  readonly environmentId: string;
  readonly actor: { readonly type: ActorType; readonly agentId?: string };
  readonly trigger: InfraOperationTrigger;
  readonly ipAddress?: string;
};
export type PowerEnvironmentResult = { readonly operationId: string };

/** Tudo que o runner em segundo plano precisa, já resolvido pelo `execute`. */
export type RunOperationParams = {
  readonly operationId: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly environmentId: string;
  readonly environmentName: string;
  readonly services: readonly RailwayServiceInstance[];
  readonly actor: PowerEnvironmentParams['actor'];
  readonly trigger: InfraOperationTrigger;
  readonly ipAddress?: string;
};

export type RunPowerOperationParams = {
  readonly direction: InfraPowerDirection;
  readonly environmentId: string;
  readonly services: readonly RailwayServiceInstance[];
  /** Chamado a cada serviço processado e a cada consulta de espera, para renovar a trava. */
  readonly onProgress: () => Promise<void>;
};

export type ResolveOperationStatusParams = { readonly serviceResults: readonly InfraServiceResult[] };

export type InfraLogger = {
  info(message: string, meta: Readonly<Record<string, unknown>>): void;
  error(message: string, meta: Readonly<Record<string, unknown>>): void;
};

export type InfraSleep = (milliseconds: number) => Promise<void>;

export type SetIfAbsentParams = {
  readonly key: string;
  readonly value: string;
  readonly ttlSeconds: number;
};

export type CalculateUsageCostParams = {
  readonly rows: readonly RailwayUsageRow[];
  readonly projectNames: ReadonlyMap<string, string>;
  readonly environmentNames: ReadonlyMap<string, string>;
};
export type EnvironmentCost = {
  readonly environmentId: string;
  readonly environmentName: string;
  readonly isProduction: boolean;
  readonly cost: number;
  readonly byMeasurement: Readonly<Record<RailwayUsageMeasurement, number>>;
};
export type ProjectCost = {
  readonly projectId: string;
  readonly projectName: string;
  readonly cost: number;
  readonly environments: readonly EnvironmentCost[];
};
export type CalculateUsageCostResult = {
  readonly totalCost: number;
  readonly projects: readonly ProjectCost[];
};

export type CostsProject = {
  readonly projectId: string;
  readonly projectName: string;
  readonly cost: number;
  readonly projected: number;
  readonly environments: readonly EnvironmentCost[];
};
export type CostsResult = {
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly windowSource: InfraCostsWindowSource;
  readonly currency: 'USD';
  readonly totalCost: number;
  readonly officialTotal?: number;
  readonly divergencePercent?: number;
  readonly isDivergent: boolean;
  readonly projectedTotal: number;
  readonly projectionMethod: 'linear';
  readonly projects: readonly CostsProject[];
  readonly pricingCheckedAt: string;
  readonly pricingSource: string;
  readonly isStale: boolean;
};

export type ResolveCostsWindowResult = {
  readonly start: string;
  readonly end: string;
  readonly windowSource: InfraCostsWindowSource;
  readonly officialTotal?: number;
};
