/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { afterEach, beforeAll, describe, expect, it } from 'bun:test';

import type { InfraEnvironment, ListInfraEnvironmentsResult } from '@/modules/infra/types/infra.types';

process.env.VITE_API_BASE_URL = 'http://localhost:3000';

const ENVIRONMENT_ID = '11111111-1111-4111-8111-111111111111';
const OPERATION_ID = '22222222-2222-4222-8222-222222222222';
const originalFetch = globalThis.fetch;

type CapturedCall = { readonly url: URL; readonly method: string | undefined; readonly body: unknown };

let infraApi: typeof import('@/modules/infra/infra.api');
let shouldPollEnvironments: typeof import('@/modules/infra/infra.hook').shouldPollEnvironments;
let calls: CapturedCall[] = [];

beforeAll(async () => {
  infraApi = await import('@/modules/infra/infra.api');
  ({ shouldPollEnvironments } = await import('@/modules/infra/infra.hook'));
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  calls = [];
});

function captureFetch(data: unknown): void {
  calls = [];
  globalThis.fetch = Object.assign(
    async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({
        url: new URL(String(input)),
        method: init?.method,
        body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
      });

      return Response.json({ data }, { status: 200 });
    },
    { preconnect: originalFetch.preconnect },
  );
}

describe('infra.api', () => {
  it('listEnvironments faz GET em /environments', async () => {
    captureFetch({ access: 'ok', projects: [] });
    await infraApi.listEnvironments();

    expect(calls[0]?.url.pathname).toBe('/v1/panel/infra/environments');
    expect(calls[0]?.method).toBe('GET');
  });

  it('powerOffEnvironment faz POST em power-off sem corpo', async () => {
    captureFetch({ operationId: OPERATION_ID });
    await infraApi.powerOffEnvironment({ environmentId: ENVIRONMENT_ID });

    expect(calls[0]?.url.pathname).toBe(`/v1/panel/infra/environments/${ENVIRONMENT_ID}/power-off`);
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.body).toBeUndefined();
  });

  it('powerOnEnvironment envia keepOnUntil quando informado', async () => {
    captureFetch({ operationId: OPERATION_ID });
    await infraApi.powerOnEnvironment({ environmentId: ENVIRONMENT_ID, keepOnUntil: '2026-10-09T20:00:00-03:00' });

    expect(calls[0]?.url.pathname).toBe(`/v1/panel/infra/environments/${ENVIRONMENT_ID}/power-on`);
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.body).toEqual({ keepOnUntil: '2026-10-09T20:00:00-03:00' });
  });

  it('powerOnEnvironment envia corpo vazio sem keepOnUntil', async () => {
    captureFetch({ operationId: OPERATION_ID });
    await infraApi.powerOnEnvironment({ environmentId: ENVIRONMENT_ID });

    expect(calls[0]?.body).toEqual({});
  });

  it('getOperation faz GET em /operations/:id', async () => {
    captureFetch({ id: OPERATION_ID });
    await infraApi.getOperation({ operationId: OPERATION_ID });

    expect(calls[0]?.url.pathname).toBe(`/v1/panel/infra/operations/${OPERATION_ID}`);
    expect(calls[0]?.method).toBe('GET');
  });

  it('saveSchedule faz PUT com o corpo sem o environmentId', async () => {
    captureFetch({ id: 'schedule' });
    await infraApi.saveSchedule({
      environmentId: ENVIRONMENT_ID,
      activeWeekdays: [1, 2, 3, 4, 5],
      powerOnTime: '08:00',
      powerOffTime: '20:00',
      isEnabled: true,
    });

    expect(calls[0]?.url.pathname).toBe(`/v1/panel/infra/environments/${ENVIRONMENT_ID}/schedule`);
    expect(calls[0]?.method).toBe('PUT');
    expect(calls[0]?.body).toEqual({
      activeWeekdays: [1, 2, 3, 4, 5],
      powerOnTime: '08:00',
      powerOffTime: '20:00',
      isEnabled: true,
    });
  });

  it('getCosts faz GET em /costs', async () => {
    captureFetch({ totalCost: 1 });
    await infraApi.getCosts();

    expect(calls[0]?.url.pathname).toBe('/v1/panel/infra/costs');
    expect(calls[0]?.method).toBe('GET');
  });
});

function buildEnvironment(overrides: Partial<InfraEnvironment>): InfraEnvironment {
  return {
    environmentId: ENVIRONMENT_ID,
    environmentName: 'staging',
    classification: 'managed',
    state: 'running',
    services: [],
    requiresKeepOnUntil: false,
    ...overrides,
  };
}

function buildResult(environment: InfraEnvironment): ListInfraEnvironmentsResult {
  return { access: 'ok', projects: [{ projectId: 'p', projectName: 'Projeto', environments: [environment] }] };
}

describe('shouldPollEnvironments', () => {
  it('nao faz polling sem dados', () => {
    expect(shouldPollEnvironments(undefined)).toBe(false);
  });

  it('nao faz polling com ambientes estaveis', () => {
    expect(shouldPollEnvironments(buildResult(buildEnvironment({ state: 'stopped' })))).toBe(false);
  });

  it('faz polling com operacao em andamento', () => {
    expect(shouldPollEnvironments(buildResult(buildEnvironment({ runningOperationId: OPERATION_ID })))).toBe(true);
  });

  it('faz polling com ambiente em transicao', () => {
    expect(shouldPollEnvironments(buildResult(buildEnvironment({ state: 'transitioning' })))).toBe(true);
  });
});
