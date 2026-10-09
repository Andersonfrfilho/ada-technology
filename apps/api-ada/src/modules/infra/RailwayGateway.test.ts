/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { INFRA_ACCESS_STATUS, RAILWAY_GRAPHQL_URL } from '@/modules/infra/infra.constant';
import { RailwayRateLimitedError, RailwayRequestFailedError } from '@/modules/infra/infra.error';
import { RailwayGateway } from '@/modules/infra/RailwayGateway';

const TOKEN = 'secret-token-abc123';
const WORKSPACE_ID = 'workspace-1';
const DEPLOYMENT_ID = 'deployment-1';

type Call = { readonly url: string; readonly init: RequestInit };
type Responder = (call: Call) => Response | Promise<Response>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function ok(data: unknown): Response {
  return jsonResponse({ data });
}

function buildGateway(responder: Responder): { gateway: RailwayGateway; calls: Call[] } {
  const calls: Call[] = [];
  const fetchImplementation = (async (url: string, init: RequestInit) => {
    const call = { url, init };
    calls.push(call);
    return responder(call);
  }) as unknown as typeof fetch;

  return { gateway: new RailwayGateway({ token: TOKEN, workspaceId: WORKSPACE_ID, fetchImplementation }), calls };
}

function serviceNode(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    serviceId: 'service-1',
    serviceName: 'web',
    source: { image: null, repo: 'owner/repo' },
    latestDeployment: {
      id: DEPLOYMENT_ID,
      status: 'SUCCESS',
      deploymentStopped: false,
      instances: [{ status: 'RUNNING' }],
    },
    activeDeployments: [{ id: DEPLOYMENT_ID }],
    ...overrides,
  };
}

function inventoryBody(nodes: Record<string, unknown>[]): unknown {
  return {
    projects: {
      edges: [
        {
          node: {
            id: 'project-1',
            name: 'ada',
            environments: {
              edges: [
                {
                  node: {
                    id: 'environment-1',
                    name: 'staging',
                    serviceInstances: { edges: nodes.map((node) => ({ node })) },
                  },
                },
              ],
            },
          },
        },
      ],
    },
  };
}

const BILLING_BODY = {
  workspace: { customer: { currentUsage: 12.5, billingPeriod: { start: '2026-09-19T14:00:56.000Z', end: '2026-10-19T14:00:56.000Z' } } },
};

async function captureError(action: () => Promise<unknown>): Promise<unknown> {
  try {
    await action();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('RailwayGateway', () => {
  describe('listInventory', () => {
    it('normaliza projetos, ambientes e servicos', async () => {
      const { gateway } = buildGateway(() => ok(inventoryBody([serviceNode({ source: { image: 'postgres:16', repo: null } })])));

      const projects = await gateway.listInventory();

      expect(projects).toEqual([
        {
          id: 'project-1',
          name: 'ada',
          environments: [
            {
              id: 'environment-1',
              name: 'staging',
              services: [
                {
                  serviceId: 'service-1',
                  serviceName: 'web',
                  sourceImage: 'postgres:16',
                  latestDeploymentId: DEPLOYMENT_ID,
                  hasDeployment: true,
                  isStopped: false,
                  instanceStatus: 'RUNNING',
                },
              ],
            },
          ],
        },
      ]);
    });

    it('marca isStopped quando deploymentStopped e verdadeiro', async () => {
      const stopped = serviceNode({
        latestDeployment: { id: DEPLOYMENT_ID, status: 'SUCCESS', deploymentStopped: true, instances: [{ status: 'RUNNING' }] },
      });
      const { gateway } = buildGateway(() => ok(inventoryBody([stopped])));

      const [project] = await gateway.listInventory();

      expect(project?.environments[0]?.services[0]?.isStopped).toBe(true);
    });

    it('marca isStopped quando a instancia esta EXITED', async () => {
      const exited = serviceNode({
        latestDeployment: { id: DEPLOYMENT_ID, status: 'SUCCESS', deploymentStopped: false, instances: [{ status: 'EXITED' }] },
      });
      const { gateway } = buildGateway(() => ok(inventoryBody([exited])));

      const [project] = await gateway.listInventory();

      expect(project?.environments[0]?.services[0]?.isStopped).toBe(true);
    });

    it('hasDeployment e falso quando latestDeployment e nulo', async () => {
      const bare = serviceNode({ latestDeployment: null, source: null, activeDeployments: [] });
      const { gateway } = buildGateway(() => ok(inventoryBody([bare])));

      const [project] = await gateway.listInventory();
      const service = project?.environments[0]?.services[0];

      expect(service?.hasDeployment).toBe(false);
      expect(service?.isStopped).toBe(false);
      expect(service?.latestDeploymentId).toBeUndefined();
      expect(service?.sourceImage).toBeUndefined();
    });
  });

  describe('mutations', () => {
    it('stopDeployment envia o id por variables e aceita true', async () => {
      const { gateway, calls } = buildGateway(() => ok({ deploymentStop: true }));

      await gateway.stopDeployment({ deploymentId: DEPLOYMENT_ID });

      const body = JSON.parse(String(calls[0]?.init.body)) as { query: string; variables: Record<string, unknown> };
      expect(body.variables).toEqual({ id: DEPLOYMENT_ID });
      expect(body.query).toContain('deploymentStop');
      expect(body.query).not.toContain(DEPLOYMENT_ID);
    });

    it('restartDeployment envia o id por variables', async () => {
      const { gateway, calls } = buildGateway(() => ok({ deploymentRestart: true }));

      await gateway.restartDeployment({ deploymentId: DEPLOYMENT_ID });

      const body = JSON.parse(String(calls[0]?.init.body)) as { query: string; variables: Record<string, unknown> };
      expect(body.variables).toEqual({ id: DEPLOYMENT_ID });
      expect(body.query).toContain('deploymentRestart');
    });

    it('redeployService envia ambiente e servico por variables', async () => {
      const { gateway, calls } = buildGateway(() => ok({ serviceInstanceRedeploy: true }));

      await gateway.redeployService({ environmentId: 'environment-9', serviceId: 'service-9' });

      const body = JSON.parse(String(calls[0]?.init.body)) as { query: string; variables: Record<string, unknown> };
      expect(body.variables).toEqual({ environmentId: 'environment-9', serviceId: 'service-9' });
      expect(body.query).not.toContain('environment-9');
      expect(body.query).not.toContain('service-9');
    });

    it('falha quando o retorno booleano nao e true', async () => {
      const { gateway } = buildGateway(() => ok({ deploymentStop: false }));

      const error = await captureError(() => gateway.stopDeployment({ deploymentId: DEPLOYMENT_ID }));

      expect(error).toBeInstanceOf(RailwayRequestFailedError);
    });
  });

  describe('custos', () => {
    it('getBillingCycle devolve inicio, fim e uso atual', async () => {
      const { gateway } = buildGateway(() => ok(BILLING_BODY));

      expect(await gateway.getBillingCycle()).toEqual({
        start: '2026-09-19T14:00:56.000Z',
        end: '2026-10-19T14:00:56.000Z',
        currentUsage: 12.5,
      });
    });

    it('getUsage achata as tags e passa as datas por variables', async () => {
      const row = { measurement: 'CPU_USAGE', value: 92.8, tags: { projectId: 'project-1', environmentId: 'environment-1' } };
      const { gateway, calls } = buildGateway(() => ok({ usage: [row] }));

      const rows = await gateway.getUsage({ startDate: '2026-09-19T14:00:56.000Z', endDate: '2026-10-19T14:00:56.000Z' });

      expect(rows).toEqual([{ measurement: 'CPU_USAGE', value: 92.8, projectId: 'project-1', environmentId: 'environment-1' }]);
      const body = JSON.parse(String(calls[0]?.init.body)) as { query: string; variables: Record<string, unknown> };
      expect(body.variables).toEqual({
        workspaceId: WORKSPACE_ID,
        startDate: '2026-09-19T14:00:56.000Z',
        endDate: '2026-10-19T14:00:56.000Z',
      });
      expect(body.query).not.toContain('2026-09-19');
    });

    it('getEstimatedUsage devolve as projecoes por projeto', async () => {
      const row = { measurement: 'MEMORY_USAGE_GB', estimatedValue: 22594.1, projectId: 'project-1', extra: 'ignorado' };
      const { gateway } = buildGateway(() => ok({ estimatedUsage: [row] }));

      const rows = await gateway.getEstimatedUsage();

      expect(rows).toHaveLength(1);
      expect(rows[0]?.estimatedValue).toBe(22594.1);
    });
  });

  describe('transporte e falhas', () => {
    it('envia POST ao endpoint com Authorization Bearer e workspace por variables', async () => {
      const { gateway, calls } = buildGateway(() => ok(BILLING_BODY));

      await gateway.getBillingCycle();

      const call = calls[0];
      expect(call?.url).toBe(RAILWAY_GRAPHQL_URL);
      expect(call?.init.method).toBe('POST');
      const headers = call?.init.headers as Record<string, string>;
      expect(headers['Authorization']).toBe(`Bearer ${TOKEN}`);
      const body = JSON.parse(String(call?.init.body)) as { query: string; variables: Record<string, unknown> };
      expect(body.variables).toEqual({ workspaceId: WORKSPACE_ID });
      expect(body.query).not.toContain(WORKSPACE_ID);
      expect(call?.init.signal).toBeInstanceOf(AbortSignal);
    });

    it('errors no corpo com HTTP 200 e falha', async () => {
      const { gateway } = buildGateway(() => jsonResponse({ errors: [{ message: 'Not Authorized' }] }));

      const error = await captureError(() => gateway.getBillingCycle());

      expect(error).toBeInstanceOf(RailwayRequestFailedError);
    });

    it('HTTP 429 vira RailwayRateLimitedError', async () => {
      const { gateway } = buildGateway(() => jsonResponse({}, 429));

      const error = await captureError(() => gateway.listInventory());

      expect(error).toBeInstanceOf(RailwayRateLimitedError);
    });

    it('HTTP 500 vira RailwayRequestFailedError com a operacao', async () => {
      const { gateway } = buildGateway(() => jsonResponse({}, 500));

      const error = await captureError(() => gateway.listInventory());

      expect(error).toBeInstanceOf(RailwayRequestFailedError);
      expect((error as RailwayRequestFailedError).context).toEqual({ operation: 'listInventory' });
    });

    it('resposta fora do schema falha', async () => {
      const { gateway } = buildGateway(() => ok({ usage: [{ measurement: 'CPU_USAGE' }] }));

      const error = await captureError(() => gateway.getUsage({ startDate: 'a', endDate: 'b' }));

      expect(error).toBeInstanceOf(RailwayRequestFailedError);
    });

    it('JSON invalido falha', async () => {
      const { gateway } = buildGateway(() => new Response('<html>bad gateway</html>', { status: 200 }));

      const error = await captureError(() => gateway.getBillingCycle());

      expect(error).toBeInstanceOf(RailwayRequestFailedError);
    });

    it('timeout ou rede derrubada falha', async () => {
      const { gateway } = buildGateway(() => {
        throw new DOMException('The operation timed out.', 'TimeoutError');
      });

      const error = await captureError(() => gateway.getBillingCycle());

      expect(error).toBeInstanceOf(RailwayRequestFailedError);
    });

    it('o token nunca aparece na mensagem nem no contexto do erro', async () => {
      const failures: Responder[] = [
        () => jsonResponse({ errors: [{ message: `bad token ${TOKEN}` }] }),
        () => jsonResponse({}, 429),
        () => jsonResponse({}, 500),
        () => {
          throw new Error(`network down for ${TOKEN}`);
        },
      ];

      for (const responder of failures) {
        const { gateway } = buildGateway(responder);
        const error = await captureError(() => gateway.getBillingCycle());

        expect(error).toBeInstanceOf(Error);
        const serialized = JSON.stringify({ message: (error as Error).message, context: (error as RailwayRequestFailedError).context });
        expect(serialized).not.toContain(TOKEN);
      }
    });
  });

  describe('verifyAccess', () => {
    it('retorna ok quando workspace e billing respondem', async () => {
      const { gateway } = buildGateway(({ init }) => {
        const { query } = JSON.parse(String(init.body)) as { query: string };
        return query.includes('customer') ? ok(BILLING_BODY) : ok({ workspace: { id: WORKSPACE_ID } });
      });

      expect(await gateway.verifyAccess()).toBe(INFRA_ACCESS_STATUS.OK);
    });

    it('retorna token_invalid quando o workspace falha, sem lancar', async () => {
      const { gateway } = buildGateway(() => jsonResponse({ errors: [{ message: 'Not Authorized' }] }));

      expect(await gateway.verifyAccess()).toBe(INFRA_ACCESS_STATUS.TOKEN_INVALID);
    });

    it('retorna token_invalid em falha de rede', async () => {
      const { gateway } = buildGateway(() => {
        throw new Error('offline');
      });

      expect(await gateway.verifyAccess()).toBe(INFRA_ACCESS_STATUS.TOKEN_INVALID);
    });

    it('retorna billing_unavailable quando so o bloco customer falha', async () => {
      const { gateway } = buildGateway(({ init }) => {
        const { query } = JSON.parse(String(init.body)) as { query: string };
        return query.includes('customer')
          ? jsonResponse({ errors: [{ message: 'forbidden' }] })
          : ok({ workspace: { id: WORKSPACE_ID } });
      });

      expect(await gateway.verifyAccess()).toBe(INFRA_ACCESS_STATUS.BILLING_UNAVAILABLE);
    });
  });
});
