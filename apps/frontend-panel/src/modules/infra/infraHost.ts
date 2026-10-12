/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { InfraApi, InfraTokenSource } from '@adatechnology/infra-ui';

import {
  getCosts,
  getOperation,
  listEnvironments,
  powerOffEnvironment,
  powerOnEnvironment,
  saveSchedule,
} from '@/modules/infra/infra.api';
import {
  getIntegration,
  removeIntegration,
  saveIntegration,
  verifyIntegration,
} from '@/modules/infra/infraIntegration.api';

/** O cliente HTTP do painel entra aqui; o pacote de UI nunca faz fetch. */
export const infraApi: InfraApi = {
  listEnvironments,
  powerOffEnvironment,
  powerOnEnvironment,
  getOperation,
  saveSchedule,
  getCosts,
  getIntegration,
  saveIntegration,
  verifyIntegration,
  removeIntegration,
};

export const INFRA_TOKEN_SOURCE: InfraTokenSource = {
  url: 'https://railway.com/account/tokens',
  label: 'railway.com/account/tokens',
};
