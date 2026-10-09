/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { RecordAuditLogUseCase } from '@/modules/audit/recordAuditLog.use-case';
import type { RecordAuditLogParams } from '@/modules/audit/types/audit.types';
import type { InfraLogger } from '@/modules/infra/types/infraRuntime.types';

type RecordInfraAuditParams = {
  readonly recordAudit: Pick<RecordAuditLogUseCase, 'execute'>;
  readonly logger: InfraLogger;
  readonly entry: RecordAuditLogParams;
};

/** Melhor esforço: falha de auditoria é logada e nunca mascara o erro nem aborta a operação em curso. */
export async function recordInfraAudit(params: RecordInfraAuditParams): Promise<void> {
  try {
    await params.recordAudit.execute(params.entry);
  } catch {
    params.logger.error('Nao foi possivel gravar a auditoria de infra', { action: params.entry.action });
  }
}
