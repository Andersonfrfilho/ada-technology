/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it, mock } from 'bun:test';

import { ACTOR_TYPE, AUDIT_ACTION, AUDIT_TARGET } from '@/modules/audit/audit.constant';

const insertedRows: Record<string, unknown>[] = [];

mock.module('@/infra/database/client', () => ({
  database: {
    insert: () => ({
      values: async (row: Record<string, unknown>) => {
        insertedRows.push(row);
      },
    }),
  },
}));

const { RecordAuditLogUseCase } = await import('@/modules/audit/recordAuditLog.use-case');

const DECOY = 'ISCA-TOKEN-0123456789';

describe('RecordAuditLogUseCase', () => {
  it('grava como [REDACTED] a metadata com chave de segredo, em qualquer profundidade', async () => {
    await new RecordAuditLogUseCase().execute({
      actorType: ACTOR_TYPE.AGENT,
      action: AUDIT_ACTION.INFRA_INTEGRATION_CONFIGURED,
      targetType: AUDIT_TARGET.AGENT,
      metadata: { token: DECOY, nested: { ciphertext: DECOY }, flowKey: 'menu' },
    });

    const row = insertedRows.at(-1);
    expect(JSON.stringify(row)).not.toContain(DECOY);
    expect(row?.metadata).toEqual({ token: '[REDACTED]', nested: { ciphertext: '[REDACTED]' }, flowKey: 'menu' });
  });

  it('mantem metadata sem segredo exatamente como veio', async () => {
    const metadata = { operationId: 'op-1', serviceResults: [{ serviceName: 'web', outcome: 'ok' }], counts: { ok: 1 } };
    await new RecordAuditLogUseCase().execute({
      actorType: ACTOR_TYPE.AGENT,
      action: AUDIT_ACTION.INFRA_INTEGRATION_CONFIGURED,
      targetType: AUDIT_TARGET.AGENT,
      metadata,
    });

    expect(insertedRows.at(-1)?.metadata).toEqual(metadata);
  });

  it('grava objeto vazio quando nao ha metadata', async () => {
    await new RecordAuditLogUseCase().execute({
      actorType: ACTOR_TYPE.AGENT,
      action: AUDIT_ACTION.INFRA_INTEGRATION_CONFIGURED,
      targetType: AUDIT_TARGET.AGENT,
    });

    expect(insertedRows.at(-1)?.metadata).toEqual({});
  });
});
