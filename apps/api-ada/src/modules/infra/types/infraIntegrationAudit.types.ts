/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { ActorType, AUDIT_ACTION, AuditAction } from '@/modules/audit/audit.constant';
import type {
  INFRA_INTEGRATION_AUDIT_REASON,
  INFRA_INTEGRATION_AUDIT_SOURCE,
} from '@/modules/infra/infraIntegrationAudit.constant';

export type InfraIntegrationAuditReason =
  (typeof INFRA_INTEGRATION_AUDIT_REASON)[keyof typeof INFRA_INTEGRATION_AUDIT_REASON];

export type InfraIntegrationAuditSource =
  (typeof INFRA_INTEGRATION_AUDIT_SOURCE)[keyof typeof INFRA_INTEGRATION_AUDIT_SOURCE];

export type InfraIntegrationAuditAction = Extract<
  AuditAction,
  | (typeof AUDIT_ACTION)['INFRA_INTEGRATION_CONFIGURED']
  | (typeof AUDIT_ACTION)['INFRA_INTEGRATION_REPLACED']
  | (typeof AUDIT_ACTION)['INFRA_INTEGRATION_REMOVED']
  | (typeof AUDIT_ACTION)['INFRA_INTEGRATION_VERIFIED']
  | (typeof AUDIT_ACTION)['INFRA_INTEGRATION_DENIED']
  | (typeof AUDIT_ACTION)['INFRA_INTEGRATION_LOCKED']
>;

/** Tipo fechado: so estes tres campos. Nenhum texto livre (message, error, token, ciphertext). */
export type InfraIntegrationAuditMetadata = {
  readonly reason: InfraIntegrationAuditReason;
  readonly source?: InfraIntegrationAuditSource;
  readonly workspaceId?: string;
};

export type BuildInfraIntegrationAuditEntryParams = {
  readonly action: InfraIntegrationAuditAction;
  readonly actor: { readonly type: ActorType; readonly agentId?: string };
  readonly ipAddress?: string;
  readonly targetId?: string;
  readonly metadata: InfraIntegrationAuditMetadata;
};
