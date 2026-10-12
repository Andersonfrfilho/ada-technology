/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { InfraProvider, IntegrationArea } from '@adatechnology/infra-ui';

import { INFRA_TOKEN_SOURCE, infraApi } from '@/modules/infra/infraHost';

export function InfraIntegrationPage() {
  return (
    <InfraProvider api={infraApi}>
      <IntegrationArea tokenSource={INFRA_TOKEN_SOURCE} />
    </InfraProvider>
  );
}
