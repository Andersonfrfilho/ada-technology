/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { INTEGRATION_PASSWORD } from '@/modules/infra/infraFakes/buildIntegrationHarness';
import {
  ADMIN_IDENTITY,
  COMMON_AGENT_IDENTITY,
  ROUTES_BASE,
  buildIntegrationRoutesSetup,
  expectResponseWithoutLeak,
} from '@/modules/infra/infraFakes/buildIntegrationRoutesSetup';
import { DECOY_TOKEN } from '@/modules/infra/infraFakes/buildProviderHarness';

const SAVE_BODY = { token: DECOY_TOKEN, password: INTEGRATION_PASSWORD };

function call(params: { readonly method: string; readonly path?: string; readonly body?: unknown }): Request {
  return new Request(`${ROUTES_BASE}${params.path ?? ''}`, {
    method: params.method,
    ...(params.body !== undefined
      ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(params.body) }
      : {}),
  });
}

const ALL_CALLS = [
  { method: 'GET' },
  { method: 'PUT', body: SAVE_BODY },
  { method: 'POST', path: '/verify' },
  { method: 'DELETE', body: { password: INTEGRATION_PASSWORD } },
] as const;

describe('rotas de integracao: acesso', () => {
  it('401 sem login em todas, sem tocar no repositorio', async () => {
    const setup = buildIntegrationRoutesSetup({ identity: undefined });
    for (const item of ALL_CALLS) expect((await setup.handle(call(item))).status).toBe(401);
    expect(setup.harness.repository.upsertCalls + setup.harness.repository.deleteCalls).toBe(0);
  });

  it('403 para agente que nao e admin em todas', async () => {
    const setup = buildIntegrationRoutesSetup({ identity: COMMON_AGENT_IDENTITY });
    for (const item of ALL_CALLS) expect((await setup.handle(call(item))).status).toBe(403);
    expect(setup.harness.passwordCalls.length).toBe(0);
  });

  it('declara os presets por IP e exige admin', () => {
    const { routes } = buildIntegrationRoutesSetup({ identity: ADMIN_IDENTITY });
    const byKey = new Map(routes.map((route) => [`${route.method} ${route.path}`, route]));
    expect(byKey.get('PUT /v1/panel/infra/integration')?.rateLimit).toEqual(RATE_LIMIT.PANEL_INFRA_INTEGRATION_WRITE);
    expect(byKey.get('DELETE /v1/panel/infra/integration')?.rateLimit).toEqual(RATE_LIMIT.PANEL_INFRA_INTEGRATION_WRITE);
    expect(byKey.get('POST /v1/panel/infra/integration/verify')?.rateLimit).toEqual(RATE_LIMIT.PANEL_INFRA_INTEGRATION_VERIFY);
    expect(byKey.get('GET /v1/panel/infra/integration')?.rateLimit).toEqual(RATE_LIMIT.PANEL_READ);
    expect(RATE_LIMIT.PANEL_INFRA_INTEGRATION_WRITE.limit).toBe(5);
    expect(RATE_LIMIT.PANEL_INFRA_INTEGRATION_VERIFY.limit).toBe(3);
    expect(routes.every((route) => route.auth === 'admin' && route.isNoStore === true)).toBe(true);
  });
});

describe('rotas de integracao: sucesso', () => {
  it('PUT 200 devolve so a visao, sem a isca no corpo nem nos headers', async () => {
    const setup = buildIntegrationRoutesSetup({ identity: ADMIN_IDENTITY });
    const response = await setup.handle(call({ method: 'PUT', body: SAVE_BODY }));

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const body = (await response.clone().json()) as { data: Record<string, unknown> };
    expect(body.data.tokenHint).toBe('6789');
    expect(Object.keys(body.data)).not.toContain('token');
    expect(Object.keys(body.data)).not.toContain('keyId');
    expect(setup.harness.repository.upsertCalls).toBe(1);
    await expectResponseWithoutLeak(setup, response);
  });

  it('GET devolve a visao sem corpo de token', async () => {
    const setup = buildIntegrationRoutesSetup({ identity: ADMIN_IDENTITY });
    const response = await setup.handle(call({ method: 'GET' }));
    const body = (await response.clone().json()) as { data: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(body.data.updatedByName).toBeUndefined();
    expect(Object.keys(body.data)).not.toContain('ciphertext');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expectResponseWithoutLeak(setup, response);
  });

  it('verify devolve { data: { access } } e DELETE devolve a visao', async () => {
    const setup = buildIntegrationRoutesSetup({ identity: ADMIN_IDENTITY });
    const verify = await setup.handle(call({ method: 'POST', path: '/verify' }));
    expect(await verify.clone().json()).toEqual({ data: { access: 'ok' } });

    const removal = await setup.handle(call({ method: 'DELETE', body: { password: INTEGRATION_PASSWORD } }));
    expect(removal.status).toBe(200);
    expect(Object.keys(((await removal.clone().json()) as { data: object }).data)).toContain('state');
    await expectResponseWithoutLeak(setup, verify);
    await expectResponseWithoutLeak(setup, removal);
  });
});

describe('rotas de integracao: validacao (400)', () => {
  const INVALID_BODIES: readonly (readonly [string, unknown])[] = [
    ['chave extra workspaceId', { ...SAVE_BODY, workspaceId: 'workspace-outro' }],
    ['token curto', { token: 'curto', password: INTEGRATION_PASSWORD }],
    ['token com espaco', { token: 'ISCA TOKEN 0123456789', password: INTEGRATION_PASSWORD }],
    ['sem senha', { token: DECOY_TOKEN }],
  ];

  for (const [name, body] of INVALID_BODIES) {
    it(`400 com ${name}, sem ecoar o valor e sem tocar no repositorio`, async () => {
      const setup = buildIntegrationRoutesSetup({ identity: ADMIN_IDENTITY });
      const response = await setup.handle(call({ method: 'PUT', body }));
      const text = await response.clone().text();

      expect(response.status).toBe(400);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(text).not.toContain('workspace-outro');
      expect(text).not.toContain('ISCA TOKEN 0123456789');
      expect(setup.harness.repository.upsertCalls).toBe(0);
      expect(setup.harness.passwordCalls.length).toBe(0);
      await expectResponseWithoutLeak(setup, response);
    });
  }

  it('DELETE sem senha ou com chave extra e 400', async () => {
    const setup = buildIntegrationRoutesSetup({ identity: ADMIN_IDENTITY });
    expect((await setup.handle(call({ method: 'DELETE' }))).status).toBe(400);
    expect((await setup.handle(call({ method: 'DELETE', body: { password: 'x', token: DECOY_TOKEN } }))).status).toBe(400);
    expect(setup.harness.repository.deleteCalls).toBe(0);
  });
});
