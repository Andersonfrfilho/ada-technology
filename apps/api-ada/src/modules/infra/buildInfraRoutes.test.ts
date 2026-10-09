/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import {
  createRouter,
  type AuthenticateRequest,
  type Route,
} from '@/infra/http/router';
import { ACTOR_TYPE } from '@/modules/audit/audit.constant';
import { buildInfraRoutes } from '@/modules/infra/buildInfraRoutes';
import { INFRA_OPERATION_TRIGGER } from '@/modules/infra/infra.constant';
import { GetInfraOperationUseCase } from '@/modules/infra/getInfraOperation.use-case';
import { PowerOffEnvironmentUseCase } from '@/modules/infra/powerOffEnvironment.use-case';
import { PowerOnEnvironmentUseCase } from '@/modules/infra/powerOnEnvironment.use-case';
import { ListInfraEnvironmentsUseCase } from '@/modules/infra/listInfraEnvironments.use-case';
import { buildPowerHarness, buildProject, buildService } from '@/modules/infra/infraFakes';
import { InfraOperationInProgressError } from '@/modules/infra/infra.error';
import { INFRA_OPERATION_LOCK_KEY_PREFIX } from '@/modules/infra/infra.constant';
import type { InfraScheduleRecord, PowerEnvironmentParams } from '@/modules/infra/types/infra.types';
import { AGENT_ROLE } from '@/shared/constants/domain.constant';

const ENVIRONMENT_ID = '22222222-2222-4222-8222-222222222222';
const ADMIN = { agentId: '33333333-3333-4333-8333-333333333333', role: AGENT_ROLE.ADMIN } as const;
const AGENT = { agentId: '44444444-4444-4444-8444-444444444444', role: AGENT_ROLE.AGENT } as const;
const SCHEDULE: InfraScheduleRecord = {
  id: '66666666-6666-4666-8666-666666666666',
  railwayProjectId: 'project-1',
  railwayEnvironmentId: ENVIRONMENT_ID,
  activeWeekdays: [1, 2, 3, 4, 5],
  powerOnTime: '08:00',
  powerOffTime: '20:00',
  timezone: 'America/Sao_Paulo',
  isEnabled: true,
  keepOnUntil: null,
  lastEvaluatedAt: null,
  lastPowerOffAt: null,
  lastPowerOnAt: null,
  updatedByAgentId: ADMIN.agentId,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};
const BASE = 'https://api.ada.test/v1/panel/infra';

type Identity = typeof ADMIN | typeof AGENT | undefined;

type Setup = {
  readonly handle: (request: Request) => Promise<Response>;
  readonly powerOffCalls: PowerEnvironmentParams[];
  readonly harness: ReturnType<typeof buildPowerHarness>;
};

function buildSetup(params: { readonly identity: Identity; readonly isConfigured?: boolean }): Setup {
  const harness = buildPowerHarness({
    gatewayOptions: {
      projects: [
        buildProject({
          environmentId: ENVIRONMENT_ID,
          environmentName: 'staging',
          services: [buildService({ name: 'web' })],
        }),
      ],
    },
    ...(params.isConfigured === false ? { isConfigured: false } : {}),
  });

  const powerOffEnvironment = new PowerOffEnvironmentUseCase(harness.dependencies);
  const powerOffCalls: PowerEnvironmentParams[] = [];
  const recordingPowerOff = {
    execute: (callParams: PowerEnvironmentParams) => {
      powerOffCalls.push(callParams);
      return powerOffEnvironment.execute(callParams);
    },
  };

  const routes = buildInfraRoutes({
    listInfraEnvironments: new ListInfraEnvironmentsUseCase({
      ...(params.isConfigured === false ? {} : { railwayGateway: harness.gateway }),
      cache: harness.cache,
      operationRepository: harness.repository,
      scheduleRepository: {
        listAll: async () => [SCHEDULE],
        findByEnvironmentId: async () => SCHEDULE,
        upsert: async () => SCHEDULE,
      },
      managedPattern: 'staging',
      selfEnvironmentId: 'env-self',
    }),
    powerOffEnvironment: recordingPowerOff,
    powerOnEnvironment: new PowerOnEnvironmentUseCase(harness.dependencies),
    getInfraOperation: new GetInfraOperationUseCase({ operationRepository: harness.repository }),
  });

  // Sem Redis nos testes: o preset de rate limit e conferido a parte, sobre a rota declarada.
  const withoutRateLimit: readonly Route[] = routes.map(({ rateLimit: _rateLimit, ...route }) => route);
  const authenticate: AuthenticateRequest = async () => params.identity;

  return { handle: createRouter({ routes: withoutRateLimit, authenticate }), powerOffCalls, harness };
}

function request(method: string, path: string): Request {
  return new Request(`${BASE}${path}`, { method });
}

const ALL_ROUTES: readonly (readonly [string, string])[] = [
  ['GET', '/environments'],
  ['POST', `/environments/${ENVIRONMENT_ID}/power-off`],
  ['POST', `/environments/${ENVIRONMENT_ID}/power-on`],
  ['GET', `/operations/${ENVIRONMENT_ID}`],
];

describe('rotas de infra: autenticacao e papel', () => {
  it.each(ALL_ROUTES)('%s %s sem login responde 401', async (method, path) => {
    const response = await buildSetup({ identity: undefined }).handle(request(method, path));
    expect(response.status).toBe(401);
  });

  it.each(ALL_ROUTES)('%s %s como atendente (nao admin) responde 403', async (method, path) => {
    const response = await buildSetup({ identity: AGENT }).handle(request(method, path));
    expect(response.status).toBe(403);
  });
});

describe('rotas de infra: erros de dominio', () => {
  it('sem token do Railway responde 503 INFRA_NOT_CONFIGURED', async () => {
    const setup = buildSetup({ identity: ADMIN, isConfigured: false });

    for (const [method, path] of ALL_ROUTES.slice(0, 3)) {
      const response = await setup.handle(request(method, path));
      expect(response.status).toBe(503);
      expect((await response.json()).error.code).toBe('INFRA_NOT_CONFIGURED');
    }
  });

  it('ambiente protegido responde 403 INFRA_ENVIRONMENT_PROTECTED', async () => {
    const protectedId = '55555555-5555-4555-8555-555555555555';
    const harness = buildPowerHarness({
      gatewayOptions: {
        projects: [
          buildProject({ environmentId: protectedId, environmentName: 'production', services: [buildService({ name: 'web' })] }),
        ],
      },
    });
    const routes = buildInfraRoutes({
      listInfraEnvironments: { execute: async () => ({ access: 'ok', projects: [] }) },
      powerOffEnvironment: new PowerOffEnvironmentUseCase(harness.dependencies),
      powerOnEnvironment: new PowerOnEnvironmentUseCase(harness.dependencies),
      getInfraOperation: new GetInfraOperationUseCase({ operationRepository: harness.repository }),
    }).map(({ rateLimit: _rateLimit, ...route }) => route);
    const handle = createRouter({ routes, authenticate: async () => ADMIN });

    const response = await handle(request('POST', `/environments/${protectedId}/power-off`));

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe('INFRA_ENVIRONMENT_PROTECTED');
  });

  it('trava ocupada responde 409 INFRA_OPERATION_IN_PROGRESS', async () => {
    const setup = buildSetup({ identity: ADMIN });
    await setup.harness.cache.setIfAbsent({
      key: `${INFRA_OPERATION_LOCK_KEY_PREFIX}${ENVIRONMENT_ID}`,
      value: 'ocupada',
      ttlSeconds: 60,
    });

    const response = await setup.handle(request('POST', `/environments/${ENVIRONMENT_ID}/power-off`));

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe(new InfraOperationInProgressError().code);
  });

  it('operacao inexistente responde 404 INFRA_OPERATION_NOT_FOUND', async () => {
    const response = await buildSetup({ identity: ADMIN }).handle(request('GET', `/operations/${ENVIRONMENT_ID}`));

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe('INFRA_OPERATION_NOT_FOUND');
  });

  it('UUID invalido responde 400 em todas as rotas com parametro', async () => {
    const setup = buildSetup({ identity: ADMIN });

    for (const [method, path] of [
      ['POST', '/environments/nao-e-uuid/power-off'],
      ['POST', '/environments/nao-e-uuid/power-on'],
      ['GET', '/operations/nao-e-uuid'],
    ] as const) {
      const response = await setup.handle(request(method, path));
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe('VALIDATION_FAILED');
    }
  });
});

describe('rotas de infra: sucesso', () => {
  it('power-off responde 202 com operationId e repassa ator, trigger e IP ao use case', async () => {
    const setup = buildSetup({ identity: ADMIN });

    const response = await setup.handle(
      new Request(`${BASE}/environments/${ENVIRONMENT_ID}/power-off`, {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.9' },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(Object.keys(body.data)).toEqual(['operationId']);
    expect(setup.powerOffCalls).toHaveLength(1);
    expect(setup.powerOffCalls[0]).toMatchObject({
      environmentId: ENVIRONMENT_ID,
      actor: { type: ACTOR_TYPE.AGENT, agentId: ADMIN.agentId },
      trigger: INFRA_OPERATION_TRIGGER.MANUAL,
    });
    expect(typeof setup.powerOffCalls[0]?.ipAddress).toBe('string');
  });

  it('GET operations devolve so os campos do plano', async () => {
    const setup = buildSetup({ identity: ADMIN });
    const operationId = '77777777-7777-4777-8777-777777777777';
    const seeded = await setup.harness.repository.create({
      railwayProjectId: 'project-1',
      railwayEnvironmentId: ENVIRONMENT_ID,
      kind: 'power_off',
      trigger: INFRA_OPERATION_TRIGGER.MANUAL,
      actorAgentId: ADMIN.agentId,
    });
    setup.harness.repository.operations[0] = { ...seeded, id: operationId };

    const response = await setup.handle(request('GET', `/operations/${operationId}`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Object.keys(body.data).sort()).toEqual(
      ['finishedAt', 'id', 'kind', 'railwayEnvironmentId', 'serviceResults', 'startedAt', 'status', 'trigger'].sort(),
    );
  });

  it('GET environments responde 200 sem campos internos da agenda', async () => {
    const response = await buildSetup({ identity: ADMIN }).handle(request('GET', '/environments'));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).not.toContain('updatedByAgentId');
    expect(text).toContain('"powerOnTime":"08:00"');
  });
});

describe('rotas de infra: rate limit', () => {
  it('power usa o preset duro e leitura usa o preset de leitura', () => {
    const noop = { execute: async () => ({ operationId: 'x' }) };
    const routes = buildInfraRoutes({
      listInfraEnvironments: { execute: async () => ({ access: 'ok', projects: [] }) },
      powerOffEnvironment: noop,
      powerOnEnvironment: noop,
      getInfraOperation: { execute: async () => { throw new Error('nao chamado'); } },
    });

    expect(routes.map((route) => route.rateLimit)).toEqual([
      RATE_LIMIT.PANEL_READ,
      RATE_LIMIT.PANEL_INFRA_POWER,
      RATE_LIMIT.PANEL_INFRA_POWER,
      RATE_LIMIT.PANEL_READ,
    ]);
    expect(RATE_LIMIT.PANEL_INFRA_POWER.limit).toBeLessThan(RATE_LIMIT.PANEL_WRITE.limit);
  });
});
