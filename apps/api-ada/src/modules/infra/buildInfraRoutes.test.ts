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
import { GetInfraCostsUseCase } from '@/modules/infra/getInfraCosts.use-case';
import { ListInfraEnvironmentsUseCase } from '@/modules/infra/listInfraEnvironments.use-case';
import { SaveEnvironmentScheduleUseCase } from '@/modules/infra/saveEnvironmentSchedule.use-case';
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

type ConsumeRateLimit = NonNullable<Parameters<typeof buildInfraRoutes>[0]['consumeRateLimit']>;

// Mesma janela fixa do Redis, em memória: conta por bucket + identidade.
function buildInMemoryRateLimit(): ConsumeRateLimit {
  const hits = new Map<string, number>();
  return async ({ bucket, identity, rule }) => {
    const key = `${bucket}:${identity}`;
    const count = (hits.get(key) ?? 0) + 1;
    hits.set(key, count);
    return count <= rule.limit ? { isAllowed: true } : { isAllowed: false, retryAfterSeconds: rule.windowSeconds };
  };
}

type Identity = { readonly agentId: string; readonly role: typeof AGENT_ROLE.ADMIN | typeof AGENT_ROLE.AGENT } | undefined;

type Setup = {
  readonly handle: (request: Request) => Promise<Response>;
  readonly powerOffCalls: PowerEnvironmentParams[];
  readonly harness: ReturnType<typeof buildPowerHarness>;
};

function buildSetup(params: {
  readonly identity: Identity;
  readonly isConfigured?: boolean;
  readonly now?: Date;
  readonly consumeRateLimit?: ConsumeRateLimit;
}): Setup {
  const now = params.now ?? new Date('2026-10-09T12:00:00Z');
  const harness = buildPowerHarness({
    now,
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

  harness.scheduleRepository.seed(SCHEDULE);
  const powerOffEnvironment = new PowerOffEnvironmentUseCase(harness.dependencies);
  const powerOffCalls: PowerEnvironmentParams[] = [];
  const recordingPowerOff = {
    execute: (callParams: PowerEnvironmentParams) => {
      powerOffCalls.push(callParams);
      return powerOffEnvironment.execute(callParams);
    },
  };

  const routes = buildInfraRoutes({
    consumeRateLimit: params.consumeRateLimit ?? (async () => ({ isAllowed: true })),
    listInfraEnvironments: new ListInfraEnvironmentsUseCase({
      ...(params.isConfigured === false ? {} : { railwayGateway: harness.gateway }),
      cache: harness.cache,
      operationRepository: harness.repository,
      scheduleRepository: harness.scheduleRepository,
      managedPattern: 'staging',
      selfEnvironmentId: 'env-self',
      databaseWaitSeconds: 120,
    }),
    powerOffEnvironment: recordingPowerOff,
    powerOnEnvironment: new PowerOnEnvironmentUseCase(harness.dependencies),
    getInfraOperation: new GetInfraOperationUseCase({ operationRepository: harness.repository }),
    getInfraCosts: new GetInfraCostsUseCase({
      ...(params.isConfigured === false ? {} : { railwayGateway: harness.gateway }),
      cache: harness.cache,
      sleep: async () => {},
      now: () => new Date('2026-10-09T12:00:00Z'),
    }),
    saveEnvironmentSchedule: new SaveEnvironmentScheduleUseCase({
      ...(params.isConfigured === false ? {} : { railwayGateway: harness.gateway }),
      scheduleRepository: harness.scheduleRepository,
      recordAudit: harness.dependencies.recordAudit,
      managedPattern: 'staging',
      selfEnvironmentId: 'env-self',
      now: () => now,
    }),
  });

  // Sem Redis nos testes: o preset de rate limit e conferido a parte, sobre a rota declarada.
  const withoutRateLimit: readonly Route[] = routes.map(({ rateLimit: _rateLimit, ...route }) => route);
  const authenticate: AuthenticateRequest = async () => params.identity;

  return { handle: createRouter({ routes: withoutRateLimit, authenticate }), powerOffCalls, harness };
}

function request(method: string, path: string): Request {
  return new Request(`${BASE}${path}`, { method });
}

function jsonRequest(params: { readonly method: string; readonly path: string; readonly body: unknown }): Request {
  return new Request(`${BASE}${params.path}`, {
    method: params.method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params.body),
  });
}

const SCHEDULE_PATH = `/environments/${ENVIRONMENT_ID}/schedule`;
const VALID_SCHEDULE_BODY = {
  activeWeekdays: [1, 2, 3, 4, 5],
  powerOnTime: '09:00',
  powerOffTime: '18:00',
  isEnabled: true,
} as const;

const ALL_ROUTES: readonly (readonly [string, string])[] = [
  ['GET', '/environments'],
  ['POST', `/environments/${ENVIRONMENT_ID}/power-off`],
  ['POST', `/environments/${ENVIRONMENT_ID}/power-on`],
  ['GET', `/operations/${ENVIRONMENT_ID}`],
  ['GET', '/costs'],
  ['PUT', `/environments/${ENVIRONMENT_ID}/schedule`],
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

    for (const [method, path] of [...ALL_ROUTES.slice(0, 3), ALL_ROUTES[4] as readonly [string, string]]) {
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
      consumeRateLimit: async () => ({ isAllowed: true }),
      listInfraEnvironments: { execute: async () => ({ access: 'ok', projects: [] }) },
      powerOffEnvironment: new PowerOffEnvironmentUseCase(harness.dependencies),
      powerOnEnvironment: new PowerOnEnvironmentUseCase(harness.dependencies),
      getInfraOperation: new GetInfraOperationUseCase({ operationRepository: harness.repository }),
      getInfraCosts: { execute: async () => { throw new Error('nao chamado'); } },
      saveEnvironmentSchedule: { execute: async () => { throw new Error('nao chamado'); } },
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

describe('rotas de infra: custos', () => {
  it('GET costs como admin responde 200 com o formato do envelope', async () => {
    const response = await buildSetup({ identity: ADMIN }).handle(request('GET', '/costs'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.currency).toBe('USD');
    expect(body.data.projectionMethod).toBe('linear');
    expect(body.data.projects).toEqual([]);
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
      getInfraCosts: { execute: async () => { throw new Error('nao chamado'); } },
      saveEnvironmentSchedule: { execute: async () => { throw new Error('nao chamado'); } },
    });

    expect(routes.map((route) => route.rateLimit)).toEqual([
      RATE_LIMIT.PANEL_READ,
      RATE_LIMIT.PANEL_INFRA_POWER,
      RATE_LIMIT.PANEL_INFRA_POWER,
      RATE_LIMIT.PANEL_READ,
      RATE_LIMIT.PANEL_READ,
      RATE_LIMIT.PANEL_WRITE,
    ]);
    expect(RATE_LIMIT.PANEL_INFRA_POWER.limit).toBeLessThan(RATE_LIMIT.PANEL_WRITE.limit);
  });
});

describe('rotas de infra: PUT schedule', () => {
  it('sem token do Railway responde 503 INFRA_NOT_CONFIGURED', async () => {
    const setup = buildSetup({ identity: ADMIN, isConfigured: false });

    const response = await setup.handle(
      jsonRequest({ method: 'PUT', path: SCHEDULE_PATH, body: VALID_SCHEDULE_BODY }),
    );

    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe('INFRA_NOT_CONFIGURED');
  });

  it('corpo invalido responde 400 VALIDATION_FAILED com todos os erros de uma vez', async () => {
    const setup = buildSetup({ identity: ADMIN });

    const response = await setup.handle(
      jsonRequest({
        method: 'PUT',
        path: SCHEDULE_PATH,
        body: { activeWeekdays: [9], powerOnTime: '25:00', powerOffTime: 'x', isEnabled: 'sim' },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(body.error.details.map((detail: { field: string }) => detail.field).sort()).toEqual([
      'activeWeekdays.0',
      'isEnabled',
      'powerOffTime',
      'powerOnTime',
    ]);
  });

  it('janela invertida responde 400 INFRA_INVALID_SCHEDULE sem stack', async () => {
    const setup = buildSetup({ identity: ADMIN });

    const response = await setup.handle(
      jsonRequest({
        method: 'PUT',
        path: SCHEDULE_PATH,
        body: { ...VALID_SCHEDULE_BODY, powerOnTime: '20:00', powerOffTime: '08:00' },
      }),
    );
    const text = await response.text();

    expect(response.status).toBe(400);
    expect(text).toContain('INFRA_INVALID_SCHEDULE');
    expect(text).not.toContain('stack');
  });

  it('200 devolve a agenda sem updatedByAgentId e com nextScheduledAction', async () => {
    const setup = buildSetup({ identity: ADMIN });

    const response = await setup.handle(
      jsonRequest({ method: 'PUT', path: SCHEDULE_PATH, body: VALID_SCHEDULE_BODY }),
    );
    const text = await response.text();
    const body = JSON.parse(text);

    expect(response.status).toBe(200);
    expect(text).not.toContain('updatedByAgentId');
    expect(body.data).toMatchObject({
      railwayEnvironmentId: ENVIRONMENT_ID,
      activeWeekdays: [1, 2, 3, 4, 5],
      powerOnTime: '09:00',
      powerOffTime: '18:00',
      isEnabled: true,
      nextScheduledAction: { kind: 'power_off', at: '2026-10-09T21:00:00.000Z' },
    });
  });
});

describe('rotas de infra: keepOnUntil no power-on', () => {
  it('fora da janela sem keepOnUntil responde 400 INFRA_KEEP_ON_UNTIL_REQUIRED e nao muta nada', async () => {
    const setup = buildSetup({ identity: ADMIN, now: new Date('2026-10-10T15:00:00Z') });

    const response = await setup.handle(request('POST', `/environments/${ENVIRONMENT_ID}/power-on`));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('INFRA_KEEP_ON_UNTIL_REQUIRED');
    expect(setup.harness.gateway.events).toEqual([]);
    expect(setup.harness.repository.operations).toHaveLength(0);
  });

  it('fora da janela com keepOnUntil valido responde 202 e grava', async () => {
    const setup = buildSetup({ identity: ADMIN, now: new Date('2026-10-10T15:00:00Z') });
    const keepOnUntil = '2026-10-10T17:00:00.000Z';

    const response = await setup.handle(
      jsonRequest({ method: 'POST', path: `/environments/${ENVIRONMENT_ID}/power-on`, body: { keepOnUntil } }),
    );

    expect(response.status).toBe(202);
    expect(setup.harness.scheduleRepository.keepOnUntilCalls).toEqual([
      { environmentId: ENVIRONMENT_ID, keepOnUntil: new Date(keepOnUntil) },
    ]);
  });

  it('keepOnUntil que nao e data ISO responde 400 VALIDATION_FAILED', async () => {
    const response = await buildSetup({ identity: ADMIN }).handle(
      jsonRequest({
        method: 'POST',
        path: `/environments/${ENVIRONMENT_ID}/power-on`,
        body: { keepOnUntil: 'amanha' },
      }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('VALIDATION_FAILED');
  });
});

describe('rotas de infra: rate limit por agente nas rotas de power', () => {
  const OTHER_ADMIN = { agentId: '77777777-7777-4777-8777-777777777777', role: AGENT_ROLE.ADMIN } as const;

  function powerRequest(params: { readonly path: string; readonly ip: string }): Request {
    return new Request(`${BASE}/environments/${ENVIRONMENT_ID}/${params.path}`, {
      method: 'POST',
      headers: { 'x-forwarded-for': params.ip },
    });
  }

  async function buildSwitchableSetup(): Promise<{ readonly handle: Setup['handle']; readonly use: (who: Identity) => void }> {
    let identity: Identity = ADMIN;
    const consumeRateLimit = buildInMemoryRateLimit();
    const noop = { execute: async () => ({ operationId: 'op' }) };
    const routes = buildInfraRoutes({
      consumeRateLimit,
      listInfraEnvironments: { execute: async () => ({ access: 'ok', projects: [] }) },
      powerOffEnvironment: noop,
      powerOnEnvironment: noop,
      getInfraOperation: { execute: async () => { throw new Error('nao chamado'); } },
      getInfraCosts: { execute: async () => { throw new Error('nao chamado'); } },
      saveEnvironmentSchedule: { execute: async () => { throw new Error('nao chamado'); } },
    }).map(({ rateLimit: _rateLimit, ...route }) => route);
    return { handle: createRouter({ routes, authenticate: async () => identity }), use: (who) => { identity = who; } };
  }

  it('o 7o pedido do mesmo agente em 1 min leva 429 RATE_LIMITED mesmo com IPs diferentes', async () => {
    const setup = await buildSwitchableSetup();

    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const response = await setup.handle(powerRequest({ path: 'power-off', ip: `203.0.113.${attempt}` }));
      expect(response.status).toBe(202);
    }
    const blocked = await setup.handle(powerRequest({ path: 'power-off', ip: '203.0.113.99' }));
    const body = (await blocked.json()) as { error: { code: string } };

    expect(blocked.status).toBe(429);
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(blocked.headers.get('Retry-After')).toBe(String(RATE_LIMIT.PANEL_INFRA_POWER_PER_AGENT.windowSeconds));
  });

  it('outro agente não é afetado pelo balde esgotado', async () => {
    const setup = await buildSwitchableSetup();
    for (let attempt = 0; attempt < 7; attempt += 1) {
      await setup.handle(powerRequest({ path: 'power-on', ip: '203.0.113.1' }));
    }

    setup.use(OTHER_ADMIN);
    const response = await setup.handle(powerRequest({ path: 'power-on', ip: '203.0.113.1' }));

    expect(response.status).toBe(202);
  });

  it('o pedido sem autenticação nunca consome o balde por agente', async () => {
    const setup = await buildSwitchableSetup();
    setup.use(undefined);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await setup.handle(powerRequest({ path: 'power-off', ip: '203.0.113.1' }))).status).toBe(401);
    }

    setup.use(ADMIN);
    expect((await setup.handle(powerRequest({ path: 'power-off', ip: '203.0.113.1' }))).status).toBe(202);
  });

  it('o preset por agente é da mesma ordem de grandeza e as rotas de power seguem com o limite por IP', () => {
    expect(RATE_LIMIT.PANEL_INFRA_POWER_PER_AGENT.limit).toBe(6);
    expect(RATE_LIMIT.PANEL_INFRA_POWER_PER_AGENT.limit).toBeLessThan(RATE_LIMIT.PANEL_WRITE.limit);
  });
});
