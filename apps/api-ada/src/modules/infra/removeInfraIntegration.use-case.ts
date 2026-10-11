/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { AUDIT_ACTION } from '@/modules/audit/audit.constant';
import { INFRA_INTEGRATION_PROVIDER } from '@/modules/infra/infra.constant';
import { assertIntegrationPreconditions } from '@/modules/infra/assertIntegrationPreconditions';
import { buildIntegrationView } from '@/modules/infra/buildIntegrationView';
import { clearInfraCaches } from '@/modules/infra/clearInfraCaches';
import { INFRA_INTEGRATION_AUDIT_REASON, INFRA_INTEGRATION_AUDIT_SOURCE } from '@/modules/infra/infraIntegrationAudit.constant';
import { buildIntegrationAuditContext, recordIntegrationAudit } from '@/modules/infra/recordIntegrationAudit';
import { INFRA_INTEGRATION_STATE } from '@/modules/infra/types/railwayGatewayProvider.types';
import type {
  RemoveInfraIntegrationDependencies,
  RemoveInfraIntegrationParams,
  RemoveInfraIntegrationResult,
} from '@/modules/infra/types/infraIntegrationUseCases.types';

export class RemoveInfraIntegrationUseCase {
  constructor(private readonly dependencies: RemoveInfraIntegrationDependencies) {}

  async execute(params: RemoveInfraIntegrationParams): Promise<RemoveInfraIntegrationResult> {
    const { config, verifyAgentPassword, integrationRepository, gatewayProvider, cache, logger, recordAudit } =
      this.dependencies;
    const context = buildIntegrationAuditContext({
      recordAudit,
      logger,
      actor: params.actor,
      ...(params.ipAddress ? { ipAddress: params.ipAddress } : {}),
    });

    await assertIntegrationPreconditions({
      context,
      config,
      verifyAgentPassword,
      password: params.password,
      requiresStoreSetup: false,
    });

    const wasRemoved = await integrationRepository.deleteLocked(INFRA_INTEGRATION_PROVIDER.RAILWAY);
    // Idempotente: sem linha nao ha o que invalidar nem o que auditar.
    if (!wasRemoved) {
      return buildIntegrationView({
        description: { source: 'none', state: INFRA_INTEGRATION_STATE.NOT_CONFIGURED, environmentTokenAlsoPresent: false },
      });
    }

    await clearInfraCaches({ gatewayProvider, cache, logger });
    await recordIntegrationAudit({
      context,
      action: AUDIT_ACTION.INFRA_INTEGRATION_REMOVED,
      metadata: { reason: INFRA_INTEGRATION_AUDIT_REASON.REMOVED, source: INFRA_INTEGRATION_AUDIT_SOURCE.PANEL },
    });

    return buildIntegrationView({ description: await gatewayProvider.describe() });
  }
}
