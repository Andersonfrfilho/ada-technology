/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { InfraAccessStatus } from '@/modules/infra/infra.constant';
import type { InfraIntegrationSource, InfraIntegrationState } from '@/modules/infra/infraIntegration.constant';

export type InfraIntegrationView = {
  readonly source: InfraIntegrationSource;
  readonly state: InfraIntegrationState;
  readonly tokenHint?: string;
  readonly workspaceId?: string;
  readonly updatedAt?: string;
  readonly updatedByName?: string;
  readonly access?: InfraAccessStatus;
  readonly environmentTokenAlsoPresent: boolean;
};

export type SaveInfraIntegrationParams = {
  readonly token: string;
  readonly password: string;
};

export type RemoveInfraIntegrationParams = {
  readonly password: string;
};

export type VerifyInfraIntegrationResult = {
  readonly access: InfraAccessStatus;
};
