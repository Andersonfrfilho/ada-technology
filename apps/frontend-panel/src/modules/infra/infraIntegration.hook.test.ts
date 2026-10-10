/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { beforeAll, describe, expect, it } from 'bun:test';
import { MutationObserver, QueryClient } from '@tanstack/react-query';

import { INFRA_QUERY_KEY } from '@/modules/infra/infra.constant';

process.env.VITE_API_BASE_URL = 'http://localhost:3000';

const BAIT_TOKEN = 'ISCA-TOKEN-0123456789';

let hook: typeof import('@/modules/infra/infraIntegration.hook');

beforeAll(async () => {
  hook = await import('@/modules/infra/infraIntegration.hook');
});

describe('mutacoes que carregam segredo', () => {
  it('salvar e remover usam gcTime 0', () => {
    const queryClient = new QueryClient();

    expect(hook.buildSaveIntegrationOptions(queryClient).gcTime).toBe(0);
    expect(hook.buildRemoveIntegrationOptions(queryClient).gcTime).toBe(0);
    expect(hook.SENSITIVE_MUTATION_GC_TIME_MS).toBe(0);
  });

  it('o cache de mutacao nao retem o token depois de terminar e resetar', async () => {
    const queryClient = new QueryClient();
    const options = {
      ...hook.buildSaveIntegrationOptions(queryClient),
      mutationFn: async () => ({ source: 'panel', state: 'configured', environmentTokenAlsoPresent: false }) as never,
    };
    const observer = new MutationObserver(queryClient, options);

    await observer.mutate({ token: BAIT_TOKEN, password: 'senha' });
    observer.reset();
    await new Promise((resolve) => setTimeout(resolve, 10));

    const retained = JSON.stringify(queryClient.getMutationCache().getAll().map((mutation) => mutation.state));
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
    expect(retained).not.toContain(BAIT_TOKEN);
  });
});

describe('invalidacao depois de mexer na integracao', () => {
  it('invalida integracao, ambientes e custos', async () => {
    const queryClient = new QueryClient();
    const keys = [INFRA_QUERY_KEY.INTEGRATION, INFRA_QUERY_KEY.ENVIRONMENTS, INFRA_QUERY_KEY.COSTS];
    for (const key of keys) queryClient.setQueryData([key], {});

    await hook.invalidateInfraQueries(queryClient);

    for (const key of keys) expect(queryClient.getQueryState([key])?.isInvalidated).toBe(true);
  });

  it('salvar, remover e verificar disparam a invalidacao ao terminar', async () => {
    const queryClient = new QueryClient();
    const builders = [
      hook.buildSaveIntegrationOptions,
      hook.buildRemoveIntegrationOptions,
      hook.buildVerifyIntegrationOptions,
    ];

    for (const build of builders) {
      queryClient.setQueryData([INFRA_QUERY_KEY.COSTS], {});
      await (build(queryClient).onSettled as () => Promise<void>)();

      expect(queryClient.getQueryState([INFRA_QUERY_KEY.COSTS])?.isInvalidated).toBe(true);
    }
  });
});
