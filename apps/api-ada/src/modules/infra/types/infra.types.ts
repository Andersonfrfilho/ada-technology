/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { z } from 'zod';

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
