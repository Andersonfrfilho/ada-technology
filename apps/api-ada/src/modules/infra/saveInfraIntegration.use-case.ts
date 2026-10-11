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
import { sealSecret } from '@/modules/infra/infraSecretCipher';
import { loadInfraSecretKey } from '@/modules/infra/infraSecretKey';
import { mapProbeOutcomeToError } from '@/modules/infra/mapProbeOutcomeToError';
import { probeWorkspace as defaultProbeWorkspace } from '@/modules/infra/probeWorkspace';
import {
  buildIntegrationAuditContext,
  recordIntegrationAudit,
  refuseIntegration,
} from '@/modules/infra/recordIntegrationAudit';
import type {
  IntegrationAuditContext,
  SaveInfraIntegrationDependencies,
  SaveInfraIntegrationParams,
  SaveInfraIntegrationResult,
} from '@/modules/infra/types/infraIntegrationUseCases.types';

const TOKEN_HINT_LENGTH = 4;
const { CONFIGURED, REPLACED } = INFRA_INTEGRATION_AUDIT_REASON;

/**
 * Ordem fixa: recusas baratas, senha, probe no Railway e so entao a gravacao. Toda recusa deixa o
 * repositorio, o provedor e o cache intocados.
 */
export class SaveInfraIntegrationUseCase {
  constructor(private readonly dependencies: SaveInfraIntegrationDependencies) {}

  async execute(params: SaveInfraIntegrationParams): Promise<SaveInfraIntegrationResult> {
    const { config, verifyAgentPassword, gatewayProvider, cache, logger, recordAudit } = this.dependencies;
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
      requiresStoreSetup: true,
    });
    await this.assertTokenAccepted({ context, token: params.token });

    const { record, wasReplacement } = await this.persist(params);
    await clearInfraCaches({ gatewayProvider, cache, logger });
    await recordIntegrationAudit({
      context,
      action: wasReplacement ? AUDIT_ACTION.INFRA_INTEGRATION_REPLACED : AUDIT_ACTION.INFRA_INTEGRATION_CONFIGURED,
      targetId: record.id,
      metadata: {
        reason: wasReplacement ? REPLACED : CONFIGURED,
        source: INFRA_INTEGRATION_AUDIT_SOURCE.PANEL,
        workspaceId: config.workspaceId,
      },
    });

    return buildIntegrationView({ description: await gatewayProvider.describe() });
  }

  private async assertTokenAccepted(params: {
    readonly context: IntegrationAuditContext;
    readonly token: string;
  }): Promise<void> {
    const { config, probeWorkspace = defaultProbeWorkspace } = this.dependencies;
    // O workspace e sempre o do ambiente: o token precisa enxergar exatamente esse, nunca um vindo da entrada.
    const outcome = await probeWorkspace({ token: params.token, workspaceId: config.workspaceId });
    const refusal = mapProbeOutcomeToError(outcome);
    if (refusal) await refuseIntegration({ context: params.context, ...refusal });
  }

  private persist(params: SaveInfraIntegrationParams) {
    const { config, integrationRepository } = this.dependencies;
    const key = loadInfraSecretKey(config.encryptionKeyBase64);
    const provider = INFRA_INTEGRATION_PROVIDER.RAILWAY;
    const ciphertext = sealSecret({ plaintext: params.token, key, provider, workspaceId: config.workspaceId });
    return integrationRepository.upsertLocked({
      provider,
      workspaceId: config.workspaceId,
      ciphertext,
      keyId: key.keyId,
      tokenHint: params.token.slice(-TOKEN_HINT_LENGTH),
      agentId: params.actor.agentId,
    });
  }
}
