/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { openSecret } from '@/modules/infra/infraSecretCipher';
import { InfraSecretUnreadableError } from '@/modules/infra/infraSecret.error';
import { loadInfraSecretKey } from '@/modules/infra/infraSecretKey';
import { INFRA_INTEGRATION_STATE } from '@/modules/infra/types/railwayGatewayProvider.types';
import type { InfraSecretKey } from '@/modules/infra/infraSecretKey';
import type { InfraIntegrationRecord } from '@/modules/infra/types/infraIntegration.types';
import type { InfraIntegrationState } from '@/modules/infra/types/railwayGatewayProvider.types';

export type PanelCredentialResolution = {
  readonly state: InfraIntegrationState;
  readonly token?: string;
  readonly unreadableReason?: string;
};

export type ResolvePanelCredentialParams = {
  readonly record: InfraIntegrationRecord;
  readonly workspaceId: string;
  readonly encryptionKeyBase64: string;
};

function tryLoadKey(encryptionKeyBase64: string): InfraSecretKey | undefined {
  if (encryptionKeyBase64.length === 0) return undefined;
  try {
    return loadInfraSecretKey(encryptionKeyBase64);
  } catch {
    return undefined;
  }
}

/** Fail closed: qualquer divergência devolve um estado sem token, nunca outra credencial. */
export function resolvePanelCredential(params: ResolvePanelCredentialParams): PanelCredentialResolution {
  const { record } = params;
  const key = tryLoadKey(params.encryptionKeyBase64);
  if (!key) return { state: INFRA_INTEGRATION_STATE.KEY_MISSING };
  if (record.keyId !== key.keyId) return { state: INFRA_INTEGRATION_STATE.KEY_MISMATCH };
  if (record.workspaceId !== params.workspaceId) return { state: INFRA_INTEGRATION_STATE.WORKSPACE_MISMATCH };
  try {
    const token = openSecret({
      sealed: record.ciphertext,
      key,
      provider: record.provider,
      workspaceId: record.workspaceId,
    });
    return { state: INFRA_INTEGRATION_STATE.CONFIGURED, token };
  } catch (error) {
    const unreadableReason = error instanceof InfraSecretUnreadableError ? error.reason : 'unknown';
    return { state: INFRA_INTEGRATION_STATE.SECRET_UNREADABLE, unreadableReason };
  }
}
