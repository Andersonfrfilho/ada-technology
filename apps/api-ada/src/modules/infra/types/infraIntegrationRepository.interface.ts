/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { InfraIntegrationProvider } from '@/modules/infra/infra.constant';
import type {
  InfraIntegrationRecord,
  UpsertLockedIntegrationParams,
  UpsertLockedIntegrationResult,
} from '@/modules/infra/types/infraIntegration.types';

export interface InfraIntegrationRepositoryInterface {
  findByProvider(provider: InfraIntegrationProvider): Promise<InfraIntegrationRecord | undefined>;
  /** Transacao com FOR UPDATE; `wasReplacement` = a linha ja existia antes desta chamada. */
  upsertLocked(params: UpsertLockedIntegrationParams): Promise<UpsertLockedIntegrationResult>;
  /** Devolve true se havia linha para remover. */
  deleteLocked(provider: InfraIntegrationProvider): Promise<boolean>;
}
