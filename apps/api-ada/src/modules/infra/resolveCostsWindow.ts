/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { INFRA_COSTS_WINDOW_SOURCE } from '@/modules/infra/infra.constant';
import type { ResolveCostsWindowResult } from '@/modules/infra/types/infraCosts.types';
import type { RailwayGatewayInterface } from '@/modules/infra/types/railwayGateway.interface';

type ResolveCostsWindowParams = {
  readonly railwayGateway: RailwayGatewayInterface;
  readonly now: () => Date;
};

function buildCalendarMonthWindow(now: Date): ResolveCostsWindowResult {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - 1);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    windowSource: INFRA_COSTS_WINDOW_SOURCE.CALENDAR_MONTH,
  };
}

// Sem permissao de cobranca a tela continua: mes-calendario e sem total oficial.
export async function resolveCostsWindow(params: ResolveCostsWindowParams): Promise<ResolveCostsWindowResult> {
  try {
    const cycle = await params.railwayGateway.getBillingCycle();
    return {
      start: cycle.start,
      end: cycle.end,
      windowSource: INFRA_COSTS_WINDOW_SOURCE.BILLING_CYCLE,
      officialTotal: cycle.currentUsage,
    };
  } catch {
    return buildCalendarMonthWindow(params.now());
  }
}
