/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { z } from 'zod';

import type { infraEnvironmentSchedules, infraPowerOperations } from '@/infra/database/schema/infra.schema';
import type {
  InfraAccessStatus,
  InfraEnvironmentClassification,
  InfraEnvironmentPowerState,
  InfraPowerDirection,
  InfraServicePowerState,
} from '@/modules/infra/infra.constant';

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

export type InfraServiceResultOutcome = 'ok' | 'failed' | 'skipped';
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
