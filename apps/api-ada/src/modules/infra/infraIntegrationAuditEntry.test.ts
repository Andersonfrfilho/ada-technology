/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { ACTOR_TYPE, AUDIT_ACTION, AUDIT_TARGET } from '@/modules/audit/audit.constant';
import { INFRA_INTEGRATION_AUDIT_REASON, INFRA_INTEGRATION_AUDIT_SOURCE } from '@/modules/infra/infraIntegrationAudit.constant';
import { buildInfraIntegrationAuditEntry } from '@/modules/infra/infraIntegrationAuditEntry';
import type {
  BuildInfraIntegrationAuditEntryParams,
  InfraIntegrationAuditAction,
  InfraIntegrationAuditMetadata,
} from '@/modules/infra/types/infraIntegrationAudit.types';

const AGENT_ID = '0b7f5c1e-3a2d-4c8e-9f10-2d3e4f5a6b7c';
const TARGET_ID = '5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b';
const IP_ADDRESS = '203.0.113.7';

const NEW_ACTIONS: InfraIntegrationAuditAction[] = [
  AUDIT_ACTION.INFRA_INTEGRATION_CONFIGURED,
  AUDIT_ACTION.INFRA_INTEGRATION_REPLACED,
  AUDIT_ACTION.INFRA_INTEGRATION_REMOVED,
  AUDIT_ACTION.INFRA_INTEGRATION_VERIFIED,
  AUDIT_ACTION.INFRA_INTEGRATION_DENIED,
  AUDIT_ACTION.INFRA_INTEGRATION_LOCKED,
];

function buildParams(overrides: Partial<BuildInfraIntegrationAuditEntryParams> = {}): BuildInfraIntegrationAuditEntryParams {
  return {
    action: AUDIT_ACTION.INFRA_INTEGRATION_CONFIGURED,
    actor: { type: ACTOR_TYPE.AGENT, agentId: AGENT_ID },
    ipAddress: IP_ADDRESS,
    targetId: TARGET_ID,
    metadata: { reason: INFRA_INTEGRATION_AUDIT_REASON.CONFIGURED },
    ...overrides,
  };
}

function buildWithMetadata(metadata: Record<string, unknown>): () => unknown {
  return () => buildInfraIntegrationAuditEntry(buildParams({ metadata: metadata as unknown as InfraIntegrationAuditMetadata }));
}

describe('buildInfraIntegrationAuditEntry', () => {
  it.each(NEW_ACTIONS)('builds the entry for %s with the integration target', (action) => {
    const entry = buildInfraIntegrationAuditEntry(buildParams({ action }));

    expect(entry).toEqual({
      actorType: ACTOR_TYPE.AGENT,
      actorId: AGENT_ID,
      ipAddress: IP_ADDRESS,
      action,
      targetType: AUDIT_TARGET.INFRA_INTEGRATION,
      targetId: TARGET_ID,
      metadata: { reason: INFRA_INTEGRATION_AUDIT_REASON.CONFIGURED },
    });
  });

  it('records a system actor without actorId and omits optional fields when absent', () => {
    const entry = buildInfraIntegrationAuditEntry({
      action: AUDIT_ACTION.INFRA_INTEGRATION_VERIFIED,
      actor: { type: ACTOR_TYPE.SYSTEM },
      metadata: { reason: INFRA_INTEGRATION_AUDIT_REASON.VERIFIED_OK },
    });

    expect(entry.actorType).toBe(ACTOR_TYPE.SYSTEM);
    expect(entry).not.toHaveProperty('actorId');
    expect(entry).not.toHaveProperty('ipAddress');
    expect(entry).not.toHaveProperty('targetId');
  });

  it('passes source and workspaceId through when given', () => {
    const entry = buildInfraIntegrationAuditEntry(
      buildParams({
        metadata: {
          reason: INFRA_INTEGRATION_AUDIT_REASON.ENVIRONMENT_MANAGED,
          source: INFRA_INTEGRATION_AUDIT_SOURCE.ENVIRONMENT,
          workspaceId: 'workspace-123',
        },
      }),
    );

    expect(entry.metadata).toEqual({
      reason: INFRA_INTEGRATION_AUDIT_REASON.ENVIRONMENT_MANAGED,
      source: INFRA_INTEGRATION_AUDIT_SOURCE.ENVIRONMENT,
      workspaceId: 'workspace-123',
    });
  });

  it('result metadata holds only the allowed keys', () => {
    const looseMetadata = { reason: INFRA_INTEGRATION_AUDIT_REASON.REPLACED, source: undefined, workspaceId: undefined };
    const entry = buildInfraIntegrationAuditEntry(
      buildParams({ metadata: looseMetadata as unknown as InfraIntegrationAuditMetadata }),
    );

    expect(Object.keys(entry.metadata ?? {})).toEqual(['reason']);
  });

  it.each(['message', 'token', 'ciphertext', 'password', 'error'])('throws RangeError for the extra key %s', (key) => {
    expect(buildWithMetadata({ reason: INFRA_INTEGRATION_AUDIT_REASON.REMOVED, [key]: 'valor-qualquer' })).toThrow(RangeError);
  });

  it('throws RangeError for an unknown reason', () => {
    expect(buildWithMetadata({ reason: 'texto livre' })).toThrow(RangeError);
  });

  it('throws RangeError for an action outside the six integration actions', () => {
    const params = buildParams({ action: AUDIT_ACTION.INFRA_ENVIRONMENT_POWERED_ON as unknown as InfraIntegrationAuditAction });

    expect(() => buildInfraIntegrationAuditEntry(params)).toThrow(RangeError);
  });
});
