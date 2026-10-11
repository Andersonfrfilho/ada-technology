/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { RailwayRateLimitedError, RailwayRequestFailedError } from '@/modules/infra/infra.error';
import { INFRA_INTEGRATION_AUDIT_REASON as REASON } from '@/modules/infra/infraIntegrationAudit.constant';
import {
  InfraIntegrationTokenRejectedError,
  InfraIntegrationTokenTooBroadError,
  InfraIntegrationWorkspaceNotFoundError,
} from '@/modules/infra/infraIntegration.error';
import { PROBE_WORKSPACE_OUTCOME as OUTCOME } from '@/modules/infra/probeWorkspace.constant';
import type { ProbeRefusal } from '@/modules/infra/types/infraIntegrationUseCases.types';
import type { ProbeWorkspaceResult } from '@/modules/infra/types/probeWorkspace.types';

function toValidRetryAfter(retryAfterSeconds: number | undefined): number | undefined {
  return retryAfterSeconds !== undefined && retryAfterSeconds >= 1 ? retryAfterSeconds : undefined;
}

/** `undefined` = o token foi aceito; qualquer outro resultado e uma recusa com motivo de auditoria. */
export function mapProbeOutcomeToError(result: ProbeWorkspaceResult): ProbeRefusal | undefined {
  switch (result.outcome) {
    case OUTCOME.OK:
      return undefined;
    case OUTCOME.TOKEN_REJECTED:
      return { reason: REASON.TOKEN_REJECTED, error: new InfraIntegrationTokenRejectedError() };
    case OUTCOME.WORKSPACE_NOT_FOUND:
      return { reason: REASON.WORKSPACE_NOT_FOUND, error: new InfraIntegrationWorkspaceNotFoundError() };
    case OUTCOME.TOO_BROAD:
      return { reason: REASON.TOKEN_TOO_BROAD, error: new InfraIntegrationTokenTooBroadError() };
    case OUTCOME.RATE_LIMITED:
      return { reason: REASON.RATE_LIMITED, error: new RailwayRateLimitedError(toValidRetryAfter(result.retryAfterSeconds)) };
    case OUTCOME.UNAVAILABLE:
      return { reason: REASON.UNAVAILABLE, error: new RailwayRequestFailedError('probeWorkspace') };
  }
}
