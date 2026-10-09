/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type {
  InfraAccessStatus,
  InfraEnvironmentClassification,
  InfraEnvironmentPowerState,
  InfraServicePowerState,
} from '@/modules/infra/infra.constant';
import type { InfraScheduleRecord, InfraNextScheduledActionView } from '@/modules/infra/types/infraSchedule.types';

export type InfraServiceView = {
  readonly serviceName: string;
  readonly isDatabase: boolean;
  readonly powerState: InfraServicePowerState;
};

export type InfraEnvironmentView = {
  readonly environmentId: string;
  readonly environmentName: string;
  readonly classification: InfraEnvironmentClassification;
  readonly state: InfraEnvironmentPowerState;
  readonly services: readonly InfraServiceView[];
  readonly requiresKeepOnUntil: boolean;
  readonly schedule?: InfraScheduleRecord;
  readonly nextScheduledAction?: InfraNextScheduledActionView;
  readonly runningOperationId?: string;
};

export type InfraProjectView = {
  readonly projectId: string;
  readonly projectName: string;
  readonly environments: readonly InfraEnvironmentView[];
};

export type ListInfraEnvironmentsResult = {
  readonly access: InfraAccessStatus;
  readonly projects: readonly InfraProjectView[];
};
