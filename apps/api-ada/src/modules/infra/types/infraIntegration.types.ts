/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { InfraIntegrationProvider } from '@/modules/infra/infra.constant';

export type InfraIntegrationRecord = {
  readonly id: string;
  readonly provider: string;
  readonly workspaceId: string;
  readonly ciphertext: string;
  readonly keyId: string;
  readonly tokenHint: string;
  readonly updatedByAgentId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type UpsertLockedIntegrationParams = {
  readonly provider: InfraIntegrationProvider;
  readonly workspaceId: string;
  readonly ciphertext: string;
  readonly keyId: string;
  readonly tokenHint: string;
  readonly agentId?: string;
};

export type UpsertLockedIntegrationResult = {
  readonly record: InfraIntegrationRecord;
  readonly wasReplacement: boolean;
};
