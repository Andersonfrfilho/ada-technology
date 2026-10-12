/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { EnvironmentsArea, InfraProvider } from '@adatechnology/infra-ui';

import { infraApi } from '@/modules/infra/infraHost';

export function InfraEnvironmentsPage() {
  return (
    <InfraProvider api={infraApi}>
      <EnvironmentsArea />
    </InfraProvider>
  );
}
