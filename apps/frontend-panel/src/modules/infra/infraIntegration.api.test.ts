/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { afterEach, beforeAll, describe, expect, it } from 'bun:test';

process.env.VITE_API_BASE_URL = 'http://localhost:3000';

const BAIT_TOKEN = 'ISCA-TOKEN-0123456789';
const BAIT_PASSWORD = 'ISCA-SENHA-0123456789';
const originalFetch = globalThis.fetch;

type CapturedCall = {
  readonly url: URL;
  readonly method: string | undefined;
  readonly body: unknown;
  readonly search: string;
};

let api: typeof import('@/modules/infra/infraIntegration.api');
let calls: CapturedCall[] = [];

beforeAll(async () => {
  api = await import('@/modules/infra/infraIntegration.api');
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  calls = [];
});

function captureFetch(data: unknown): void {
  calls = [];
  globalThis.fetch = Object.assign(
    async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      calls.push({
        url,
        method: init?.method,
        search: url.search,
        body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
      });

      return Response.json({ data }, { status: 200 });
    },
    { preconnect: originalFetch.preconnect },
  );
}

const VIEW = { source: 'panel', state: 'configured', tokenHint: '6789', environmentTokenAlsoPresent: false };

describe('infraIntegration.api', () => {
  it('getIntegration faz GET em /integration sem corpo', async () => {
    captureFetch(VIEW);
    await api.getIntegration();

    expect(calls[0]?.url.pathname).toBe('/v1/panel/infra/integration');
    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.body).toBeUndefined();
  });

  it('saveIntegration faz PUT com SO token e password', async () => {
    captureFetch(VIEW);
    await api.saveIntegration({ token: BAIT_TOKEN, password: BAIT_PASSWORD });

    expect(calls[0]?.url.pathname).toBe('/v1/panel/infra/integration');
    expect(calls[0]?.method).toBe('PUT');
    expect(Object.keys(calls[0]?.body as object).sort()).toEqual(['password', 'token']);
    expect(calls[0]?.body).toEqual({ token: BAIT_TOKEN, password: BAIT_PASSWORD });
  });

  it('saveIntegration nao repassa campo extra (workspace nunca e enviado)', async () => {
    captureFetch(VIEW);
    const paramsWithExtra = { token: BAIT_TOKEN, password: BAIT_PASSWORD, workspaceId: 'ws-1' };
    await api.saveIntegration(paramsWithExtra);

    expect(Object.keys(calls[0]?.body as object).sort()).toEqual(['password', 'token']);
  });

  it('o token nunca vai na URL', async () => {
    captureFetch(VIEW);
    await api.saveIntegration({ token: BAIT_TOKEN, password: BAIT_PASSWORD });

    expect(calls[0]?.search).toBe('');
    expect(calls[0]?.url.href).not.toContain(BAIT_TOKEN);
  });

  it('verifyIntegration faz POST em /integration/verify sem corpo', async () => {
    captureFetch({ access: 'ok' });
    await api.verifyIntegration();

    expect(calls[0]?.url.pathname).toBe('/v1/panel/infra/integration/verify');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.body).toBeUndefined();
  });

  it('removeIntegration faz DELETE com SO password', async () => {
    captureFetch({ source: 'none', state: 'not_configured', environmentTokenAlsoPresent: false });
    await api.removeIntegration({ password: BAIT_PASSWORD });

    expect(calls[0]?.url.pathname).toBe('/v1/panel/infra/integration');
    expect(calls[0]?.method).toBe('DELETE');
    expect(calls[0]?.body).toEqual({ password: BAIT_PASSWORD });
  });
});
