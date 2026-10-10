/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { PROBE_WORKSPACE_OUTCOME } from '@/modules/infra/probeWorkspace.constant';

export type ProbeWorkspaceParams = {
  readonly token: string;
  readonly workspaceId: string;
  readonly fetchImplementation?: typeof fetch;
  readonly now?: () => number;
};

type ProbeOutcome = (typeof PROBE_WORKSPACE_OUTCOME)[keyof typeof PROBE_WORKSPACE_OUTCOME];

export type ProbeWorkspaceResult =
  | { readonly outcome: Exclude<ProbeOutcome, typeof PROBE_WORKSPACE_OUTCOME.RATE_LIMITED> }
  | { readonly outcome: typeof PROBE_WORKSPACE_OUTCOME.RATE_LIMITED; readonly retryAfterSeconds?: number };
