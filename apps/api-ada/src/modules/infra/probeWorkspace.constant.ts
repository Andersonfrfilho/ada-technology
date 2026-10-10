/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export const PROBE_WORKSPACE_OUTCOME = {
  OK: 'ok',
  TOKEN_REJECTED: 'token_rejected',
  WORKSPACE_NOT_FOUND: 'workspace_not_found',
  TOO_BROAD: 'too_broad',
  UNAVAILABLE: 'unavailable',
  RATE_LIMITED: 'rate_limited',
} as const;

export const PROBE_WORKSPACE_OPERATION = {
  WORKSPACE: 'probeWorkspace',
  ACCOUNT_SCOPE: 'probeAccountScope',
} as const;
