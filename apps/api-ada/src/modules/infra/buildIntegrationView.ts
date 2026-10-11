/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { InfraAccessStatus } from '@/modules/infra/infra.constant';
import type { InfraIntegrationView } from '@/modules/infra/types/infraIntegrationUseCases.types';
import type { InfraIntegrationDescription } from '@/modules/infra/types/railwayGatewayProvider.types';

type BuildIntegrationViewParams = {
  readonly description: InfraIntegrationDescription;
  readonly updatedByName?: string | undefined;
  readonly access?: InfraAccessStatus | undefined;
};

/** Campo a campo, nunca por espalhamento: o que nao esta aqui (token, cifrado, keyId, id do agente) nao sai. */
export function buildIntegrationView(params: BuildIntegrationViewParams): InfraIntegrationView {
  const { description, updatedByName, access } = params;
  return {
    source: description.source,
    state: description.state,
    ...(description.tokenHint !== undefined ? { tokenHint: description.tokenHint } : {}),
    ...(description.workspaceId !== undefined ? { workspaceId: description.workspaceId } : {}),
    ...(description.updatedAt !== undefined ? { updatedAt: description.updatedAt } : {}),
    ...(updatedByName !== undefined ? { updatedByName } : {}),
    ...(access !== undefined ? { access } : {}),
    environmentTokenAlsoPresent: description.environmentTokenAlsoPresent,
  };
}
