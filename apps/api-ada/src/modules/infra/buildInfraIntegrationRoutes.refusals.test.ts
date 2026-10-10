/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import {
  INTEGRATION_PASSWORD,
  type IntegrationHarness,
} from '@/modules/infra/infraFakes/buildIntegrationHarness';
import {
  ADMIN_IDENTITY,
  OTHER_ADMIN_IDENTITY,
  ROUTES_BASE,
  buildIntegrationRoutesSetup,
  expectResponseWithoutLeak,
} from '@/modules/infra/infraFakes/buildIntegrationRoutesSetup';
import { DECOY_TOKEN } from '@/modules/infra/infraFakes/buildProviderHarness';
import { PROBE_WORKSPACE_OUTCOME } from '@/modules/infra/probeWorkspace.constant';

const SAVE_BODY = { token: DECOY_TOKEN, password: INTEGRATION_PASSWORD };

function put(body: unknown = SAVE_BODY, identityMarker?: string): Request {
  return new Request(ROUTES_BASE, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...(identityMarker ? { 'x-test-identity': identityMarker } : {}) },
    body: JSON.stringify(body),
  });
}

async function expectRefusal(params: {
  readonly response: Response;
  readonly status: number;
  readonly code: string;
  readonly harness: IntegrationHarness;
  readonly setup: ReturnType<typeof buildIntegrationRoutesSetup>;
}): Promise<void> {
  const { response, status, code, setup } = params;
  expect(response.status).toBe(status);
  expect(((await response.clone().json()) as { error: { code: string } }).error.code).toBe(code);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  await expectResponseWithoutLeak(setup, response);
}

describe('rotas de integracao: recusas do dominio', () => {
  it('503 sem chave de cifra, 403 fora de producao, 409 com token de ambiente', async () => {
    const cases = [
      { config: { encryptionKeyBase64: '' }, status: 503, code: 'INFRA_SECRET_KEY_MISSING' },
      { config: { env: 'dev' }, status: 403, code: 'INFRA_INTEGRATION_PRODUCTION_ONLY' },
      { config: { environmentToken: 'ISCA-AMBIENTE-0123456789' }, status: 409, code: 'INFRA_INTEGRATION_ENVIRONMENT_MANAGED' },
    ];
    for (const item of cases) {
      const setup = buildIntegrationRoutesSetup({ identity: ADMIN_IDENTITY, config: item.config });
      const response = await setup.handle(put());
      await expectRefusal({ response, status: item.status, code: item.code, harness: setup.harness, setup });
      expect(setup.harness.repository.upsertCalls).toBe(0);
    }
  });

  it('403 com senha invalida, sem gravar', async () => {
    const setup = buildIntegrationRoutesSetup({ identity: ADMIN_IDENTITY });
    setup.harness.state.passwordResult = { outcome: 'invalid' };
    const response = await setup.handle(put());

    await expectRefusal({ response, status: 403, code: 'INFRA_INTEGRATION_PASSWORD_INVALID', harness: setup.harness, setup });
    expect(setup.harness.repository.upsertCalls).toBe(0);
  });

  it('423 com Retry-After vindo do bloqueio', async () => {
    const setup = buildIntegrationRoutesSetup({ identity: ADMIN_IDENTITY });
    setup.harness.state.passwordResult = { outcome: 'locked', retryAfterSeconds: 120, isNewLock: false };
    const response = await setup.handle(put());

    await expectRefusal({ response, status: 423, code: 'INFRA_INTEGRATION_LOCKED', harness: setup.harness, setup });
    expect(response.headers.get('Retry-After')).toBe('120');
  });

  it('422 nos tres tipos de recusa do probe, sem gravar', async () => {
    const outcomes = [
      [PROBE_WORKSPACE_OUTCOME.TOKEN_REJECTED, 'INFRA_INTEGRATION_TOKEN_REJECTED'],
      [PROBE_WORKSPACE_OUTCOME.WORKSPACE_NOT_FOUND, 'INFRA_INTEGRATION_WORKSPACE_NOT_FOUND'],
      [PROBE_WORKSPACE_OUTCOME.TOO_BROAD, 'INFRA_INTEGRATION_TOKEN_TOO_BROAD'],
    ] as const;
    for (const [outcome, code] of outcomes) {
      const setup = buildIntegrationRoutesSetup({ identity: ADMIN_IDENTITY });
      setup.harness.state.probeResult = { outcome };
      const response = await setup.handle(put());
      await expectRefusal({ response, status: 422, code, harness: setup.harness, setup });
      expect(setup.harness.repository.upsertCalls).toBe(0);
    }
  });

  it('503 do probe limitado sem prazo do Railway nunca devolve Retry-After 0', async () => {
    const results = [
      { outcome: PROBE_WORKSPACE_OUTCOME.RATE_LIMITED },
      { outcome: PROBE_WORKSPACE_OUTCOME.RATE_LIMITED, retryAfterSeconds: 0 },
    ] as const;
    for (const probeResult of results) {
      const setup = buildIntegrationRoutesSetup({ identity: ADMIN_IDENTITY });
      setup.harness.state.probeResult = probeResult;
      const response = await setup.handle(put());

      await expectRefusal({ response, status: 503, code: 'RAILWAY_RATE_LIMITED', harness: setup.harness, setup });
      const retryAfter = response.headers.get('Retry-After');
      expect(retryAfter === null || Number(retryAfter) >= 1).toBe(true);
    }
  });

  it('503 do probe limitado com prazo mantem o Retry-After informado', async () => {
    const setup = buildIntegrationRoutesSetup({ identity: ADMIN_IDENTITY });
    setup.harness.state.probeResult = { outcome: PROBE_WORKSPACE_OUTCOME.RATE_LIMITED, retryAfterSeconds: 42 };
    const response = await setup.handle(put());

    expect(response.status).toBe(503);
    expect(response.headers.get('Retry-After')).toBe('42');
  });

  it('DELETE com senha errada nao remove', async () => {
    const setup = buildIntegrationRoutesSetup({ identity: ADMIN_IDENTITY });
    setup.harness.state.passwordResult = { outcome: 'invalid' };
    const response = await setup.handle(
      new Request(ROUTES_BASE, { method: 'DELETE', body: JSON.stringify({ password: INTEGRATION_PASSWORD }) }),
    );

    await expectRefusal({ response, status: 403, code: 'INFRA_INTEGRATION_PASSWORD_INVALID', harness: setup.harness, setup });
    expect(setup.harness.repository.deleteCalls).toBe(0);
  });
});

describe('rotas de integracao: limite por agente', () => {
  it('429 no 6o PUT do mesmo agente, com Retry-After e no-store; outro agente segue', async () => {
    const setup = buildIntegrationRoutesSetup({
      identity: ADMIN_IDENTITY,
      identityByToken: { other: OTHER_ADMIN_IDENTITY },
    });
    for (let attempt = 0; attempt < 5; attempt += 1) expect((await setup.handle(put())).status).toBe(200);

    const blocked = await setup.handle(put());
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBe('60');
    expect(blocked.headers.get('Cache-Control')).toBe('no-store');
    expect(setup.harness.repository.upsertCalls).toBe(5);
    expect((await setup.handle(put(SAVE_BODY, 'other'))).status).toBe(200);
  });

  it('429 no 4o verify do mesmo agente', async () => {
    const setup = buildIntegrationRoutesSetup({ identity: ADMIN_IDENTITY });
    const verify = () => setup.handle(new Request(`${ROUTES_BASE}/verify`, { method: 'POST' }));
    for (let attempt = 0; attempt < 3; attempt += 1) expect((await verify()).status).toBe(200);

    const blocked = await verify();
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBe('60');
  });

  it('PUT e DELETE contam em baldes separados', async () => {
    const setup = buildIntegrationRoutesSetup({ identity: ADMIN_IDENTITY });
    for (let attempt = 0; attempt < 5; attempt += 1) await setup.handle(put());
    const removal = await setup.handle(
      new Request(ROUTES_BASE, { method: 'DELETE', body: JSON.stringify({ password: INTEGRATION_PASSWORD }) }),
    );
    expect(removal.status).toBe(200);
  });
});
