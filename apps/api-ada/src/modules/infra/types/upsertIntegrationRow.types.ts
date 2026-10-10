/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { InfraIntegrationRecord } from '@/modules/infra/types/infraIntegration.types';

/** Passos sobre a linha de integracao, todos dentro da mesma transacao. */
export type IntegrationRowOperations = {
  /** `true` quando a linha existe e ficou travada para esta transacao. */
  readonly lockExisting: () => Promise<boolean>;
  /** `undefined` quando um INSERT concorrente ja ocupou a chave unica. */
  readonly insertIfAbsent: () => Promise<InfraIntegrationRecord | undefined>;
  /** `undefined` quando a linha sumiu (DELETE concorrente) antes da troca. */
  readonly replace: () => Promise<InfraIntegrationRecord | undefined>;
};
