/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type {
  InfraIntegrationView,
  RemoveInfraIntegrationParams,
  SaveInfraIntegrationParams,
  VerifyInfraIntegrationResult,
} from '@/modules/infra/types/infraIntegration.types';
import { HTTP_METHOD, PANEL_PATH } from '@/modules/shared/http/http.constant';
import { panelRequest } from '@/modules/shared/http/panelHttpClient';

export async function getIntegration(): Promise<InfraIntegrationView> {
  return panelRequest<InfraIntegrationView>({ path: PANEL_PATH.INFRA_INTEGRATION });
}

/** O corpo e montado campo a campo: o workspace nunca viaja, e um campo extra no parametro nao vaza. */
export async function saveIntegration({ token, password }: SaveInfraIntegrationParams): Promise<InfraIntegrationView> {
  return panelRequest<InfraIntegrationView>({
    path: PANEL_PATH.INFRA_INTEGRATION,
    method: HTTP_METHOD.PUT,
    body: { token, password },
  });
}

export async function verifyIntegration(): Promise<VerifyInfraIntegrationResult> {
  return panelRequest<VerifyInfraIntegrationResult>({
    path: PANEL_PATH.INFRA_INTEGRATION_VERIFY,
    method: HTTP_METHOD.POST,
  });
}

export async function removeIntegration({ password }: RemoveInfraIntegrationParams): Promise<InfraIntegrationView> {
  return panelRequest<InfraIntegrationView>({
    path: PANEL_PATH.INFRA_INTEGRATION,
    method: HTTP_METHOD.DELETE,
    body: { password },
  });
}
