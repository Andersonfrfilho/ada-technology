/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { ACTOR_TYPE, AUDIT_ACTION, AUDIT_TARGET } from '@/modules/audit/audit.constant';
import type { RecordAuditLogUseCase } from '@/modules/audit/recordAuditLog.use-case';
import { isUuid } from '@/modules/infra/isUuid';
import { recordInfraAudit } from '@/modules/infra/recordInfraAudit';
import { resolveRunningOperationCutoff } from '@/modules/infra/resolveRunningOperationCutoff';
import type { InfraLogger, InfraOperationRecord } from '@/modules/infra/types/infra.types';
import type { InfraOperationRepositoryInterface } from '@/modules/infra/types/infraOperationRepository.interface';

type Dependencies = {
  readonly operationRepository: InfraOperationRepositoryInterface;
  readonly recordAudit: Pick<RecordAuditLogUseCase, 'execute'>;
  readonly logger: InfraLogger;
  readonly databaseWaitSeconds: number;
  readonly now: () => Date;
};

/**
 * No boot e a cada tick do agendador, operacao `running` mais velha que o TTL da trava e de um processo
 * que morreu no meio (deploy, crash): sem isto o painel mostraria "em andamento" para sempre.
 */
export class RecoverInterruptedInfraOperationsUseCase {
  constructor(private readonly dependencies: Dependencies) {}

  async execute(): Promise<number> {
    const { operationRepository, databaseWaitSeconds, now } = this.dependencies;

    const interrupted = await operationRepository.markStaleRunningAsInterrupted({
      olderThan: resolveRunningOperationCutoff({ now: now(), databaseWaitSeconds }),
    });
    await Promise.all(interrupted.map((operation) => this.auditInterruption(operation)));

    return interrupted.length;
  }

  private async auditInterruption(operation: InfraOperationRecord): Promise<void> {
    const { recordAudit, logger } = this.dependencies;
    await recordInfraAudit({
      recordAudit,
      logger,
      entry: {
        actorType: ACTOR_TYPE.SYSTEM,
        action: AUDIT_ACTION.INFRA_OPERATION_INTERRUPTED,
        targetType: AUDIT_TARGET.INFRA_ENVIRONMENT,
        ...(isUuid(operation.railwayEnvironmentId) ? { targetId: operation.railwayEnvironmentId } : {}),
        metadata: {
          operationId: operation.id,
          kind: operation.kind,
          startedAt: operation.startedAt.toISOString(),
          railwayEnvironmentId: operation.railwayEnvironmentId,
        },
      },
    });
  }
}
