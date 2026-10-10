/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { ACTOR_TYPE, AUDIT_ACTION } from '@/modules/audit/audit.constant';
import { buildInfraIntegrationAuditEntry } from '@/modules/infra/infraIntegrationAuditEntry';
import { recordInfraAudit } from '@/modules/infra/recordInfraAudit';
import type {
  IntegrationAuditContext,
  RecordIntegrationAuditParams,
  RefuseIntegrationParams,
} from '@/modules/infra/types/infraIntegrationUseCases.types';

/** Metadata so passa pelo helper fechado; a falha de gravacao so loga (ver `recordInfraAudit`). */
export async function recordIntegrationAudit(params: RecordIntegrationAuditParams): Promise<void> {
  const { context, action, metadata, targetId } = params;
  const entry = buildInfraIntegrationAuditEntry({
    action,
    actor: { type: ACTOR_TYPE.AGENT, agentId: context.actor.agentId },
    ...(context.ipAddress ? { ipAddress: context.ipAddress } : {}),
    ...(targetId ? { targetId } : {}),
    metadata,
  });
  await recordInfraAudit({ recordAudit: context.recordAudit, logger: context.logger, entry });
}

/** Toda recusa grava `infra.integration_denied` antes de lancar, e nunca chega perto do repositorio. */
export async function refuseIntegration(params: RefuseIntegrationParams): Promise<never> {
  await recordIntegrationAudit({
    context: params.context,
    action: AUDIT_ACTION.INFRA_INTEGRATION_DENIED,
    metadata: { reason: params.reason },
  });
  throw params.error;
}

export function buildIntegrationAuditContext(
  params: Pick<IntegrationAuditContext, 'recordAudit' | 'logger' | 'actor' | 'ipAddress'>,
): IntegrationAuditContext {
  return {
    recordAudit: params.recordAudit,
    logger: params.logger,
    actor: params.actor,
    ...(params.ipAddress ? { ipAddress: params.ipAddress } : {}),
  };
}
