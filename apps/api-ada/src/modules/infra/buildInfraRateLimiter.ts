/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { INFRA_RATE_LIMIT_PROFILE } from '@adatechnology/infra-contracts';
import type { InfraRateLimiterInterface, InfraRateLimitProfile } from '@adatechnology/infra-contracts';

import { consumeRateLimit as defaultConsumeRateLimit, type RateLimitRule } from '@/infra/http/rateLimit';
import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import type { ConsumeRateLimit } from '@/modules/infra/types/infraRoutes.types';

/** Perfil declarado pelo módulo → regra de limite do produto. Serve ao limite por IP e ao por administrador. */
export const RATE_LIMIT_RULE_BY_PROFILE: Readonly<Record<InfraRateLimitProfile, RateLimitRule>> = {
  [INFRA_RATE_LIMIT_PROFILE.READ]: RATE_LIMIT.PANEL_READ,
  [INFRA_RATE_LIMIT_PROFILE.WRITE]: RATE_LIMIT.PANEL_WRITE,
  [INFRA_RATE_LIMIT_PROFILE.POWER]: RATE_LIMIT.PANEL_INFRA_POWER,
  [INFRA_RATE_LIMIT_PROFILE.POWER_PER_AGENT]: RATE_LIMIT.PANEL_INFRA_POWER_PER_AGENT,
  [INFRA_RATE_LIMIT_PROFILE.INTEGRATION_WRITE]: RATE_LIMIT.PANEL_INFRA_INTEGRATION_WRITE,
  [INFRA_RATE_LIMIT_PROFILE.INTEGRATION_VERIFY]: RATE_LIMIT.PANEL_INFRA_INTEGRATION_VERIFY,
};

export function buildInfraRateLimiter(consume: ConsumeRateLimit = defaultConsumeRateLimit): InfraRateLimiterInterface {
  return {
    consume: ({ bucket, identity, profile }) =>
      consume({ bucket, identity, rule: RATE_LIMIT_RULE_BY_PROFILE[profile] }),
  };
}
