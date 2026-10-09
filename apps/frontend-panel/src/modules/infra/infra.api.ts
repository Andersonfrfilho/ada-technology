/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { HTTP_METHOD, PANEL_PATH } from '@/modules/shared/http/http.constant';
import { panelRequest } from '@/modules/shared/http/panelHttpClient';
import type {
  GetInfraOperationParams,
  InfraCosts,
  InfraOperation,
  ListInfraEnvironmentsResult,
  PowerEnvironmentResult,
  PowerOffEnvironmentParams,
  PowerOnEnvironmentParams,
  SaveEnvironmentScheduleParams,
  SaveEnvironmentScheduleResult,
} from '@/modules/infra/types/infra.types';

export async function listEnvironments(): Promise<ListInfraEnvironmentsResult> {
  return panelRequest<ListInfraEnvironmentsResult>({ path: PANEL_PATH.INFRA_ENVIRONMENTS });
}

export async function powerOffEnvironment({ environmentId }: PowerOffEnvironmentParams): Promise<PowerEnvironmentResult> {
  return panelRequest<PowerEnvironmentResult>({
    path: `${PANEL_PATH.INFRA_ENVIRONMENTS}/${environmentId}/power-off`,
    method: HTTP_METHOD.POST,
  });
}

export async function powerOnEnvironment({
  environmentId,
  keepOnUntil,
}: PowerOnEnvironmentParams): Promise<PowerEnvironmentResult> {
  return panelRequest<PowerEnvironmentResult>({
    path: `${PANEL_PATH.INFRA_ENVIRONMENTS}/${environmentId}/power-on`,
    method: HTTP_METHOD.POST,
    body: keepOnUntil ? { keepOnUntil } : {},
  });
}

export async function getOperation({ operationId }: GetInfraOperationParams): Promise<InfraOperation> {
  return panelRequest<InfraOperation>({ path: `${PANEL_PATH.INFRA_OPERATIONS}/${operationId}` });
}

export async function saveSchedule({
  environmentId,
  ...body
}: SaveEnvironmentScheduleParams): Promise<SaveEnvironmentScheduleResult> {
  return panelRequest<SaveEnvironmentScheduleResult>({
    path: `${PANEL_PATH.INFRA_ENVIRONMENTS}/${environmentId}/schedule`,
    method: HTTP_METHOD.PUT,
    body,
  });
}

export async function getCosts(): Promise<InfraCosts> {
  return panelRequest<InfraCosts>({ path: PANEL_PATH.INFRA_COSTS });
}
