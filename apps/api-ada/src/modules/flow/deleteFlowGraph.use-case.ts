/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { ACTOR_TYPE, AUDIT_ACTION, AUDIT_TARGET } from '@/modules/audit/audit.constant';
import type { RecordAuditLogUseCase } from '@/modules/audit/recordAuditLog.use-case';
import { DEFAULT_FLOW_KEY } from '@/modules/conversation/conversation.constant';
import { FlowNotFoundError, FlowRootNotDeletableError } from '@/modules/flow/flow.error';
import type { DeleteFlowGraphParams, FlowGraphPort } from '@/modules/flow/types/flow.types';

type Dependencies = {
  readonly flows: FlowGraphPort;
  readonly recordAuditLog: RecordAuditLogUseCase;
};

export class DeleteFlowGraphUseCase {
  constructor(private readonly dependencies: Dependencies) {}

  async execute({ companyId, key, agentId, ipAddress }: DeleteFlowGraphParams): Promise<void> {
    if (key === DEFAULT_FLOW_KEY) throw new FlowRootNotDeletableError(key);

    const existing = await this.dependencies.flows.get({ companyId, key });
    if (!existing) throw new FlowNotFoundError(key);

    await this.dependencies.flows.remove({ companyId, key });

    await this.dependencies.recordAuditLog.execute({
      actorType: ACTOR_TYPE.AGENT,
      actorId: agentId,
      action: AUDIT_ACTION.FLOW_DELETED,
      targetType: AUDIT_TARGET.FLOW,
      metadata: { flowKey: key, label: existing.label },
      ...(ipAddress ? { ipAddress } : {}),
    });
  }
}
