/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { ACTOR_TYPE, AUDIT_ACTION, AUDIT_TARGET } from '@/modules/audit/audit.constant';
import type { RecordAuditLogParams } from '@/modules/audit/types/audit.types';
import { INFRA_POWER_DIRECTION, type InfraPowerDirection } from '@/modules/infra/infra.constant';
import {
  InfraEnvironmentNotFoundError,
  InfraEnvironmentProtectedError,
  InfraKeepOnUntilRequiredError,
  InfraOperationInProgressError,
} from '@/modules/infra/infra.error';
import { isUuid } from '@/modules/infra/isUuid';
import type { ServiceOutcomeCounts } from '@/modules/infra/resolveOperationStatus';
import type { PowerEnvironmentParams, PowerOutcomeParams } from '@/modules/infra/types/infraOperation.types';

type ActorFields = Pick<RecordAuditLogParams, 'actorType' | 'actorId' | 'ipAddress'>;

type PowerRequestedParams = {
  readonly params: PowerEnvironmentParams;
  readonly direction: InfraPowerDirection;
  readonly operationId: string;
  readonly projectName: string;
  readonly environmentName: string;
};

type PowerCompletedParams = {
  readonly outcome: PowerOutcomeParams;
  readonly direction: InfraPowerDirection;
  readonly counts: ServiceOutcomeCounts;
};

type PowerDeniedParams = {
  readonly params: PowerEnvironmentParams;
  readonly direction: InfraPowerDirection;
  readonly reason: string;
};

function buildActorFields(params: Pick<PowerEnvironmentParams, 'actor' | 'ipAddress'>): ActorFields {
  return {
    actorType: params.actor.type,
    ...(params.actor.type === ACTOR_TYPE.AGENT && params.actor.agentId ? { actorId: params.actor.agentId } : {}),
    ...(params.ipAddress ? { ipAddress: params.ipAddress } : {}),
  };
}

/** Recusas que merecem trilha: tentativa de agir sobre ambiente que o painel não pode (ou não deve) mexer agora. */
export function resolveDenialReason(error: unknown): string | undefined {
  const isDenial =
    error instanceof InfraEnvironmentProtectedError ||
    error instanceof InfraEnvironmentNotFoundError ||
    error instanceof InfraOperationInProgressError ||
    error instanceof InfraKeepOnUntilRequiredError;
  return isDenial ? error.code : undefined;
}

export function buildPowerRequestedEntry(params: PowerRequestedParams): RecordAuditLogParams {
  return {
    ...buildActorFields(params.params),
    action: AUDIT_ACTION.INFRA_ENVIRONMENT_POWER_REQUESTED,
    targetType: AUDIT_TARGET.INFRA_ENVIRONMENT,
    targetId: params.params.environmentId,
    metadata: {
      operationId: params.operationId,
      direction: params.direction,
      trigger: params.params.trigger,
      projectName: params.projectName,
      environmentName: params.environmentName,
    },
  };
}

export function buildPowerDeniedEntry(params: PowerDeniedParams): RecordAuditLogParams {
  return {
    ...buildActorFields(params.params),
    action: AUDIT_ACTION.INFRA_ENVIRONMENT_POWER_DENIED,
    targetType: AUDIT_TARGET.INFRA_ENVIRONMENT,
    ...(isUuid(params.params.environmentId) ? { targetId: params.params.environmentId } : {}),
    metadata: { direction: params.direction, trigger: params.params.trigger, reason: params.reason },
  };
}

export function buildPowerCompletedEntry(options: PowerCompletedParams): RecordAuditLogParams {
  const { outcome, direction, counts } = options;
  const { params, status, serviceResults } = outcome;
  return {
    ...buildActorFields(params),
    action:
      direction === INFRA_POWER_DIRECTION.OFF
        ? AUDIT_ACTION.INFRA_ENVIRONMENT_POWERED_OFF
        : AUDIT_ACTION.INFRA_ENVIRONMENT_POWERED_ON,
    targetType: AUDIT_TARGET.INFRA_ENVIRONMENT,
    targetId: params.environmentId,
    metadata: {
      operationId: params.operationId,
      projectName: params.projectName,
      environmentName: params.environmentName,
      trigger: params.trigger,
      status,
      serviceResults,
      counts,
    },
  };
}
