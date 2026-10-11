/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { InfraIntegrationConcurrentChangeError } from '@/modules/infra/infraIntegration.error';
import type { UpsertLockedIntegrationResult } from '@/modules/infra/types/infraIntegration.types';
import type { IntegrationRowOperations } from '@/modules/infra/types/upsertIntegrationRow.types';

// Uma segunda volta cobre INSERT e DELETE concorrentes; perder as duas corridas vira 409, nunca 500.
const MAX_ATTEMPTS = 2;

export async function upsertIntegrationRow(operations: IntegrationRowOperations): Promise<UpsertLockedIntegrationResult> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    if (await operations.lockExisting()) {
      const replaced = await operations.replace();
      if (replaced) return { record: replaced, wasReplacement: true };
      continue;
    }
    const inserted = await operations.insertIfAbsent();
    if (inserted) return { record: inserted, wasReplacement: false };
  }
  throw new InfraIntegrationConcurrentChangeError();
}
