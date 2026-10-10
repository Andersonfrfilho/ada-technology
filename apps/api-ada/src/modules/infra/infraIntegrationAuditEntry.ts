/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { ACTOR_TYPE, AUDIT_ACTION, AUDIT_TARGET } from '@/modules/audit/audit.constant';
import type { RecordAuditLogParams } from '@/modules/audit/types/audit.types';
import {
  INFRA_INTEGRATION_AUDIT_REASON,
  INFRA_INTEGRATION_AUDIT_SOURCE,
} from '@/modules/infra/infraIntegrationAudit.constant';
import type {
  BuildInfraIntegrationAuditEntryParams,
  InfraIntegrationAuditMetadata,
} from '@/modules/infra/types/infraIntegrationAudit.types';

// Checagem em runtime: o TypeScript nao impede um objeto largo vindo de fora de chegar aqui.
const ALLOWED_ACTIONS: ReadonlySet<string> = new Set<string>([
  AUDIT_ACTION.INFRA_INTEGRATION_CONFIGURED,
  AUDIT_ACTION.INFRA_INTEGRATION_REPLACED,
  AUDIT_ACTION.INFRA_INTEGRATION_REMOVED,
  AUDIT_ACTION.INFRA_INTEGRATION_VERIFIED,
  AUDIT_ACTION.INFRA_INTEGRATION_DENIED,
  AUDIT_ACTION.INFRA_INTEGRATION_LOCKED,
]);
const ALLOWED_METADATA_KEYS: ReadonlySet<string> = new Set<string>(['reason', 'source', 'workspaceId']);
const ALLOWED_REASONS: ReadonlySet<string> = new Set<string>(Object.values(INFRA_INTEGRATION_AUDIT_REASON));
const ALLOWED_SOURCES: ReadonlySet<string> = new Set<string>(Object.values(INFRA_INTEGRATION_AUDIT_SOURCE));

function assertClosedMetadata(metadata: InfraIntegrationAuditMetadata): void {
  const hasExtraKey = Object.keys(metadata).some((key) => !ALLOWED_METADATA_KEYS.has(key));
  if (hasExtraKey) throw new RangeError('Metadata de auditoria de integracao fora do formato fechado');
  if (!ALLOWED_REASONS.has(metadata.reason)) throw new RangeError('Motivo de auditoria de integracao invalido');
  if (metadata.source !== undefined && !ALLOWED_SOURCES.has(metadata.source)) {
    throw new RangeError('Origem de auditoria de integracao invalida');
  }
}

function pickClosedMetadata(metadata: InfraIntegrationAuditMetadata): InfraIntegrationAuditMetadata {
  return {
    reason: metadata.reason,
    ...(metadata.source !== undefined ? { source: metadata.source } : {}),
    ...(metadata.workspaceId !== undefined ? { workspaceId: metadata.workspaceId } : {}),
  };
}

/** Monta a entrada de auditoria da integracao: so campos fechados, nunca o token, a senha ou o cifrado. */
export function buildInfraIntegrationAuditEntry(params: BuildInfraIntegrationAuditEntryParams): RecordAuditLogParams {
  if (!ALLOWED_ACTIONS.has(params.action)) throw new RangeError('Acao de auditoria de integracao invalida');
  assertClosedMetadata(params.metadata);

  return {
    actorType: params.actor.type,
    ...(params.actor.type === ACTOR_TYPE.AGENT && params.actor.agentId ? { actorId: params.actor.agentId } : {}),
    ...(params.ipAddress ? { ipAddress: params.ipAddress } : {}),
    action: params.action,
    targetType: AUDIT_TARGET.INFRA_INTEGRATION,
    ...(params.targetId ? { targetId: params.targetId } : {}),
    metadata: pickClosedMetadata(params.metadata),
  };
}
