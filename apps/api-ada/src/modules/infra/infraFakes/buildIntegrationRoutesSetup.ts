/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { createRouter, type AuthenticateRequest } from '@/infra/http/router';
import { buildInfraIntegrationRoutes } from '@/modules/infra/buildInfraIntegrationRoutes';
import { GetInfraIntegrationUseCase } from '@/modules/infra/getInfraIntegration.use-case';
import { INFRA_ACCESS_STATUS } from '@/modules/infra/infra.constant';
import {
  buildCountingGateway,
  buildIntegrationHarness,
  INTEGRATION_AGENT_ID,
  type IntegrationHarnessOptions,
} from '@/modules/infra/infraFakes/buildIntegrationHarness';
import { expectNoIntegrationLeak } from '@/modules/infra/infraFakes/expectNoIntegrationLeak';
import { RemoveInfraIntegrationUseCase } from '@/modules/infra/removeInfraIntegration.use-case';
import { SaveInfraIntegrationUseCase } from '@/modules/infra/saveInfraIntegration.use-case';
import type { ConsumeRateLimit } from '@/modules/infra/types/infraRoutes.types';
import { VerifyInfraIntegrationUseCase } from '@/modules/infra/verifyInfraIntegration.use-case';
import { AGENT_ROLE } from '@/shared/constants/domain.constant';

export const ROUTES_BASE = 'https://api.ada.test/v1/panel/infra/integration';
export const ADMIN_IDENTITY = { agentId: INTEGRATION_AGENT_ID, role: AGENT_ROLE.ADMIN } as const;
export const OTHER_ADMIN_IDENTITY = { agentId: '55555555-5555-4555-8555-555555555555', role: AGENT_ROLE.ADMIN } as const;
export const COMMON_AGENT_IDENTITY = { agentId: '44444444-4444-4444-8444-444444444444', role: AGENT_ROLE.AGENT } as const;

type Identity =
  | { readonly agentId: string; readonly role: typeof AGENT_ROLE.ADMIN | typeof AGENT_ROLE.AGENT }
  | undefined;

/** Mesma janela fixa do Redis, em memoria: conta por bucket + identidade. */
export function buildInMemoryRateLimit(): ConsumeRateLimit {
  const hits = new Map<string, number>();
  return async ({ bucket, identity, rule }) => {
    const key = `${bucket}:${identity}`;
    const count = (hits.get(key) ?? 0) + 1;
    hits.set(key, count);
    return count <= rule.limit ? { isAllowed: true } : { isAllowed: false, retryAfterSeconds: rule.windowSeconds };
  };
}

type SetupOptions = IntegrationHarnessOptions & {
  readonly identity?: Identity;
  readonly identityByToken?: Readonly<Record<string, Identity>>;
  readonly consumeRateLimit?: ConsumeRateLimit;
};

export function buildIntegrationRoutesSetup(options: SetupOptions = {}) {
  const harness = buildIntegrationHarness(options);
  const { dependencies, provider, cache } = harness;
  provider.description = {
    source: 'panel',
    state: 'configured',
    tokenHint: '6789',
    workspaceId: dependencies.config.workspaceId,
    environmentTokenAlsoPresent: false,
  };
  provider.gateway = buildCountingGateway(INFRA_ACCESS_STATUS.OK).gateway;
  const routes = buildInfraIntegrationRoutes({
    consumeRateLimit: options.consumeRateLimit ?? buildInMemoryRateLimit(),
    getInfraIntegration: new GetInfraIntegrationUseCase({ gatewayProvider: provider, cache, findAgentName: async () => 'Ana' }),
    saveInfraIntegration: new SaveInfraIntegrationUseCase(dependencies),
    removeInfraIntegration: new RemoveInfraIntegrationUseCase(dependencies),
    verifyInfraIntegration: new VerifyInfraIntegrationUseCase({
      gatewayProvider: provider,
      cache,
      recordAudit: dependencies.recordAudit,
      logger: dependencies.logger,
    }),
  });
  // Sem Redis nos testes: o preset por IP e conferido a parte, sobre a rota declarada.
  const withoutIpLimit = routes.map(({ rateLimit: _rateLimit, ...route }) => route);
  const authenticate: AuthenticateRequest = async (request) => {
    const marker = request.headers.get('x-test-identity') ?? '';
    return marker in (options.identityByToken ?? {}) ? options.identityByToken?.[marker] : options.identity;
  };
  const handle = createRouter({ routes: withoutIpLimit, authenticate });
  return { handle, routes, harness };
}

export type IntegrationRoutesSetup = ReturnType<typeof buildIntegrationRoutesSetup>;

/** Varredura da isca no corpo e nos headers da resposta, alem de auditoria, logs e cache do harness. */
export async function expectResponseWithoutLeak(setup: IntegrationRoutesSetup, response: Response): Promise<void> {
  const headers = JSON.stringify([...response.headers.entries()]);
  expectNoIntegrationLeak({ harness: setup.harness, observed: [await response.clone().text(), headers] });
}
