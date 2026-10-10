/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { DefaultRailwayGatewayProvider } from '@/modules/infra/RailwayGatewayProvider';
import { buildFakeGateway } from '@/modules/infra/infraFakes/buildFakeGateway';
import { FAKE_NOW } from '@/modules/infra/infraFakes/fakeNow.constant';
import { FakeIntegrationRepository } from '@/modules/infra/infraFakes/FakeIntegrationRepository';
import { sealSecret } from '@/modules/infra/infraSecretCipher';
import { loadInfraSecretKey } from '@/modules/infra/infraSecretKey';
import type { InfraIntegrationProvider } from '@/modules/infra/infra.constant';
import type { InfraIntegrationRecord } from '@/modules/infra/types/infraIntegration.types';
import type { CreateRailwayGatewayParams } from '@/modules/infra/types/railwayGateway.types';
import type { RailwayGatewayInterface } from '@/modules/infra/types/railwayGateway.interface';
import type { RailwayGatewayProviderConfig } from '@/modules/infra/types/railwayGatewayProvider.types';

export const DECOY_TOKEN = 'ISCA-TOKEN-0123456789';
export const WORKSPACE_ID = 'workspace-1';
export const KEY_BASE64 = Buffer.alloc(32, 3).toString('base64');
export const OTHER_KEY_BASE64 = Buffer.alloc(32, 8).toString('base64');
export const REREAD_MILLISECONDS = 30_000;

export class ControlledRepository extends FakeIntegrationRepository {
  reads = 0;
  failWith: Error | undefined;
  /** Uma promessa por leitura, na ordem; a leitura captura o estado ANTES de esperar. */
  readonly gates: Promise<void>[] = [];

  override async findByProvider(provider: InfraIntegrationProvider): Promise<InfraIntegrationRecord | undefined> {
    this.reads += 1;
    if (this.failWith) throw this.failWith;
    const snapshot = this.records.get(provider);
    const gate = this.gates.shift();
    if (gate) await gate;
    return snapshot;
  }
}

export function buildRecord(overrides: Partial<InfraIntegrationRecord> = {}): InfraIntegrationRecord {
  const workspaceId = overrides.workspaceId ?? WORKSPACE_ID;
  const key = loadInfraSecretKey(KEY_BASE64);
  return {
    id: 'integration-1',
    provider: 'railway',
    workspaceId,
    ciphertext: sealSecret({ plaintext: DECOY_TOKEN, key, provider: 'railway', workspaceId }),
    keyId: key.keyId,
    tokenHint: '6789',
    updatedByAgentId: null,
    createdAt: FAKE_NOW,
    updatedAt: FAKE_NOW,
    ...overrides,
  };
}

export type ProviderHarnessOptions = { readonly config?: Partial<RailwayGatewayProviderConfig> };

export function buildProviderHarness(options: ProviderHarnessOptions = {}) {
  const repository = new ControlledRepository();
  const logs: string[] = [];
  const builtWith: CreateRailwayGatewayParams[] = [];
  const clock = { now: 0 };
  const config: RailwayGatewayProviderConfig = {
    env: 'production',
    environmentToken: '',
    workspaceId: WORKSPACE_ID,
    environmentId: 'environment-1',
    encryptionKeyBase64: KEY_BASE64,
    ...options.config,
  };
  const provider = new DefaultRailwayGatewayProvider({
    config,
    integrationRepository: repository,
    buildGateway: (params): RailwayGatewayInterface => {
      builtWith.push(params);
      return buildFakeGateway({ projects: [] });
    },
    now: () => clock.now,
    logger: {
      info: (message, meta) => void logs.push(`${message} ${JSON.stringify(meta)}`),
      error: (message, meta) => void logs.push(`${message} ${JSON.stringify(meta)}`),
    },
  });
  return { provider, repository, logs, builtWith, clock };
}
