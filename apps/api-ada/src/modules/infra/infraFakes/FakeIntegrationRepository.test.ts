/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { INFRA_INTEGRATION_PROVIDER } from '@/modules/infra/infra.constant';
import { FakeIntegrationRepository } from '@/modules/infra/infraFakes/FakeIntegrationRepository';

const PARAMS = {
  provider: INFRA_INTEGRATION_PROVIDER.RAILWAY,
  workspaceId: 'workspace-1',
  ciphertext: 'v1.sealed',
  keyId: 'abcd1234abcd1234',
  tokenHint: '6789',
} as const;

describe('FakeIntegrationRepository', () => {
  it('marca criacao e depois troca, preservando createdAt', async () => {
    const repository = new FakeIntegrationRepository();
    const first = await repository.upsertLocked(PARAMS);
    const second = await repository.upsertLocked({ ...PARAMS, tokenHint: '0000' });

    expect(first.wasReplacement).toBe(false);
    expect(second.wasReplacement).toBe(true);
    expect(second.record.tokenHint).toBe('0000');
    expect(second.record.createdAt).toEqual(first.record.createdAt);
  });

  it('deleteLocked devolve true uma vez e false depois', async () => {
    const repository = new FakeIntegrationRepository();
    await repository.upsertLocked(PARAMS);

    expect(await repository.deleteLocked(INFRA_INTEGRATION_PROVIDER.RAILWAY)).toBe(true);
    expect(await repository.deleteLocked(INFRA_INTEGRATION_PROVIDER.RAILWAY)).toBe(false);
    expect(await repository.findByProvider(INFRA_INTEGRATION_PROVIDER.RAILWAY)).toBeUndefined();
  });
});
