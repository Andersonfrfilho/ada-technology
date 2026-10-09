/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { RAILWAY_GRAPHQL_URL, INFRA_ACCESS_STATUS, type InfraAccessStatus } from '@/modules/infra/infra.constant';
import { RailwayRateLimitedError, RailwayRequestFailedError } from '@/modules/infra/infra.error';
import {
  billingCycleResponseSchema,
  deploymentRestartResponseSchema,
  deploymentStopResponseSchema,
  estimatedUsageResponseSchema,
  inventoryResponseSchema,
  railwayEnvelopeSchema,
  serviceInstanceRedeployResponseSchema,
  usageResponseSchema,
  workspaceResponseSchema,
  type InventoryResponse,
} from '@/modules/infra/railwayGateway.schema';
import type { RailwayGatewayInterface } from '@/modules/infra/types/railwayGateway.interface';
import type {
  ExecuteRailwayParams,
  GetUsageParams,
  RailwayBillingCycle,
  RailwayEstimatedUsageRow,
  RailwayGatewayDependencies,
  RailwayProject,
  RailwayServiceInstance,
  RailwayUsageRow,
  RedeployServiceParams,
  RestartDeploymentParams,
  StopDeploymentParams,
} from '@/modules/infra/types/infra.types';

const REQUEST_TIMEOUT_MILLISECONDS = 20_000;
const HTTP_TOO_MANY_REQUESTS = 429;
const EXITED_INSTANCE_STATUS = 'EXITED';

const OPERATION = {
  INVENTORY: 'listInventory',
  STOP: 'deploymentStop',
  RESTART: 'deploymentRestart',
  REDEPLOY: 'serviceInstanceRedeploy',
  BILLING_CYCLE: 'getBillingCycle',
  USAGE: 'getUsage',
  ESTIMATED_USAGE: 'getEstimatedUsage',
  VERIFY_WORKSPACE: 'verifyWorkspace',
} as const;

const INVENTORY_QUERY = `query ListInventory($workspaceId: String!) {
  projects(workspaceId: $workspaceId) {
    edges { node {
      id name
      environments { edges { node {
        id name
        serviceInstances { edges { node {
          serviceId serviceName
          source { image repo }
          latestDeployment { id status deploymentStopped instances { status } }
          activeDeployments { id }
        } } }
      } } }
    } }
  }
}`;

const STOP_MUTATION = 'mutation StopDeployment($id: String!) { deploymentStop(id: $id) }';
const RESTART_MUTATION = 'mutation RestartDeployment($id: String!) { deploymentRestart(id: $id) }';
const REDEPLOY_MUTATION = `mutation RedeployService($environmentId: String!, $serviceId: String!) {
  serviceInstanceRedeploy(environmentId: $environmentId, serviceId: $serviceId)
}`;

const WORKSPACE_QUERY = 'query VerifyWorkspace($workspaceId: String!) { workspace(workspaceId: $workspaceId) { id } }';

const BILLING_CYCLE_QUERY = `query BillingCycle($workspaceId: String!) {
  workspace(workspaceId: $workspaceId) { customer { currentUsage billingPeriod { start end } } }
}`;

const USAGE_QUERY = `query Usage($workspaceId: String!, $startDate: DateTime!, $endDate: DateTime!) {
  usage(
    workspaceId: $workspaceId, startDate: $startDate, endDate: $endDate,
    measurements: [CPU_USAGE, MEMORY_USAGE_GB, NETWORK_TX_GB, DISK_USAGE_GB],
    groupBy: [PROJECT_ID, ENVIRONMENT_ID]
  ) { measurement value tags { projectId environmentId } }
}`;

const ESTIMATED_USAGE_QUERY = `query EstimatedUsage($workspaceId: String!) {
  estimatedUsage(workspaceId: $workspaceId, measurements: [CPU_USAGE, MEMORY_USAGE_GB]) {
    measurement estimatedValue projectId
  }
}`;

/**
 * A borda entre a API GraphQL do Railway e o dominio.
 *
 * Toda resposta e entrada nao confiavel: passa por zod, e `errors` conta como falha mesmo com HTTP 200.
 * O token so vai no header; nunca entra em mensagem, contexto de erro ou log.
 */
export class RailwayGateway implements RailwayGatewayInterface {
  private readonly fetchImplementation: typeof fetch;

  constructor(private readonly dependencies: RailwayGatewayDependencies) {
    this.fetchImplementation = dependencies.fetchImplementation ?? fetch;
  }

  async listInventory(): Promise<readonly RailwayProject[]> {
    const data = await this.execute({
      operationName: OPERATION.INVENTORY,
      query: INVENTORY_QUERY,
      variables: { workspaceId: this.dependencies.workspaceId },
      schema: inventoryResponseSchema,
    });

    return normalizeInventory(data);
  }

  async stopDeployment(params: StopDeploymentParams): Promise<void> {
    const data = await this.execute({
      operationName: OPERATION.STOP,
      query: STOP_MUTATION,
      variables: { id: params.deploymentId },
      schema: deploymentStopResponseSchema,
    });

    assertAccepted(data.deploymentStop, OPERATION.STOP);
  }

  async restartDeployment(params: RestartDeploymentParams): Promise<void> {
    const data = await this.execute({
      operationName: OPERATION.RESTART,
      query: RESTART_MUTATION,
      variables: { id: params.deploymentId },
      schema: deploymentRestartResponseSchema,
    });

    assertAccepted(data.deploymentRestart, OPERATION.RESTART);
  }

  async redeployService(params: RedeployServiceParams): Promise<void> {
    const data = await this.execute({
      operationName: OPERATION.REDEPLOY,
      query: REDEPLOY_MUTATION,
      variables: { environmentId: params.environmentId, serviceId: params.serviceId },
      schema: serviceInstanceRedeployResponseSchema,
    });

    assertAccepted(data.serviceInstanceRedeploy, OPERATION.REDEPLOY);
  }

  async getBillingCycle(): Promise<RailwayBillingCycle> {
    const data = await this.execute({
      operationName: OPERATION.BILLING_CYCLE,
      query: BILLING_CYCLE_QUERY,
      variables: { workspaceId: this.dependencies.workspaceId },
      schema: billingCycleResponseSchema,
    });
    const { currentUsage, billingPeriod } = data.workspace.customer;

    return { start: billingPeriod.start, end: billingPeriod.end, currentUsage };
  }

  async getUsage(params: GetUsageParams): Promise<readonly RailwayUsageRow[]> {
    const data = await this.execute({
      operationName: OPERATION.USAGE,
      query: USAGE_QUERY,
      variables: {
        workspaceId: this.dependencies.workspaceId,
        startDate: params.startDate,
        endDate: params.endDate,
      },
      schema: usageResponseSchema,
    });

    return data.usage.map((row) => ({
      measurement: row.measurement,
      value: row.value,
      projectId: row.tags.projectId,
      environmentId: row.tags.environmentId,
    }));
  }

  async getEstimatedUsage(): Promise<readonly RailwayEstimatedUsageRow[]> {
    const data = await this.execute({
      operationName: OPERATION.ESTIMATED_USAGE,
      query: ESTIMATED_USAGE_QUERY,
      variables: { workspaceId: this.dependencies.workspaceId },
      schema: estimatedUsageResponseSchema,
    });

    return data.estimatedUsage;
  }

  async verifyAccess(): Promise<InfraAccessStatus> {
    const isWorkspaceReadable = await this.succeeds(() =>
      this.execute({
        operationName: OPERATION.VERIFY_WORKSPACE,
        query: WORKSPACE_QUERY,
        variables: { workspaceId: this.dependencies.workspaceId },
        schema: workspaceResponseSchema,
      }),
    );
    if (!isWorkspaceReadable) return INFRA_ACCESS_STATUS.TOKEN_INVALID;

    const isBillingReadable = await this.succeeds(() => this.getBillingCycle());

    return isBillingReadable ? INFRA_ACCESS_STATUS.OK : INFRA_ACCESS_STATUS.BILLING_UNAVAILABLE;
  }

  /** verifyAccess nao lanca: o erro de dominio e descartado de proposito e so o veredito sai. */
  private async succeeds(action: () => Promise<unknown>): Promise<boolean> {
    try {
      await action();
      return true;
    } catch {
      return false;
    }
  }

  private async execute<TData>(params: ExecuteRailwayParams<TData>): Promise<TData> {
    const { operationName, query, variables, schema } = params;

    try {
      const response = await this.fetchImplementation(RAILWAY_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.dependencies.token}`,
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
      });

      if (response.status === HTTP_TOO_MANY_REQUESTS) throw new RailwayRateLimitedError();
      if (!response.ok) throw new RailwayRequestFailedError(operationName);

      const envelope = railwayEnvelopeSchema.safeParse(await response.json());
      if (!envelope.success) throw new RailwayRequestFailedError(operationName);
      if (envelope.data.errors && envelope.data.errors.length > 0) throw new RailwayRequestFailedError(operationName);

      const parsed = schema.safeParse(envelope.data.data);
      if (!parsed.success) throw new RailwayRequestFailedError(operationName);

      return parsed.data;
    } catch (error) {
      if (error instanceof RailwayRateLimitedError || error instanceof RailwayRequestFailedError) throw error;

      throw new RailwayRequestFailedError(operationName);
    }
  }
}

function assertAccepted(isAccepted: boolean, operationName: string): void {
  if (!isAccepted) throw new RailwayRequestFailedError(operationName);
}

function normalizeInventory(data: InventoryResponse): RailwayProject[] {
  return data.projects.edges.map(({ node: project }) => ({
    id: project.id,
    name: project.name,
    environments: project.environments.edges.map(({ node: environment }) => ({
      id: environment.id,
      name: environment.name,
      services: environment.serviceInstances.edges.map(({ node }) => normalizeServiceInstance(node)),
    })),
  }));
}

type RawServiceInstance = InventoryResponse['projects']['edges'][number]['node']['environments']['edges'][number]['node']['serviceInstances']['edges'][number]['node'];

function normalizeServiceInstance(node: RawServiceInstance): RailwayServiceInstance {
  const deployment = node.latestDeployment;
  const instanceStatus = deployment?.instances[0]?.status;
  const sourceImage = node.source?.image;

  return {
    serviceId: node.serviceId,
    serviceName: node.serviceName,
    ...(sourceImage ? { sourceImage } : {}),
    ...(deployment ? { latestDeploymentId: deployment.id } : {}),
    hasDeployment: Boolean(deployment),
    isStopped: deployment?.deploymentStopped === true || instanceStatus === EXITED_INSTANCE_STATUS,
    ...(instanceStatus ? { instanceStatus } : {}),
  };
}
