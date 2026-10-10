/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { RedisCache } from '@/infra/cache/RedisCache';
import { environment } from '@/infra/config/environment';
import {
  agentRepository,
  infraLogger,
  railwayGatewayProvider,
  recordAuditLog,
  refreshTokens,
} from '@/infra/container';
import { VerifyAgentPasswordUseCase } from '@/modules/agent/verifyAgentPassword.use-case';
import { DrizzleInfraIntegrationRepository } from '@/modules/infra/DrizzleInfraIntegrationRepository';
import { GetInfraIntegrationUseCase } from '@/modules/infra/getInfraIntegration.use-case';
import { RedisFailureCounter } from '@/modules/infra/RedisFailureCounter';
import { RemoveInfraIntegrationUseCase } from '@/modules/infra/removeInfraIntegration.use-case';
import { SaveInfraIntegrationUseCase } from '@/modules/infra/saveInfraIntegration.use-case';
import { VerifyInfraIntegrationUseCase } from '@/modules/infra/verifyInfraIntegration.use-case';

/** Montagem a parte do `container.ts`, que ja passa de mil linhas; so existe a partir do que ele exporta. */
const infraCache = new RedisCache();

const verifyAgentPassword = new VerifyAgentPasswordUseCase({
  agents: agentRepository,
  failureCounter: new RedisFailureCounter(),
  refreshTokens,
});

const integrationConfig = {
  env: environment.ENV,
  workspaceId: environment.RAILWAY_WORKSPACE_ID,
  environmentId: environment.RAILWAY_ENVIRONMENT_ID,
  encryptionKeyBase64: environment.INFRA_SECRET_ENCRYPTION_KEY,
  environmentToken: environment.RAILWAY_API_TOKEN,
};

const writeDependencies = {
  config: integrationConfig,
  integrationRepository: new DrizzleInfraIntegrationRepository(),
  gatewayProvider: railwayGatewayProvider,
  cache: infraCache,
  verifyAgentPassword,
  recordAudit: recordAuditLog,
  logger: infraLogger,
};

export const saveInfraIntegration = new SaveInfraIntegrationUseCase(writeDependencies);
export const removeInfraIntegration = new RemoveInfraIntegrationUseCase(writeDependencies);

export const verifyInfraIntegration = new VerifyInfraIntegrationUseCase({
  gatewayProvider: railwayGatewayProvider,
  cache: infraCache,
  recordAudit: recordAuditLog,
  logger: infraLogger,
});

export const getInfraIntegration = new GetInfraIntegrationUseCase({
  gatewayProvider: railwayGatewayProvider,
  cache: infraCache,
  findAgentName: async (agentId) => (await agentRepository.findById(agentId))?.name,
});
