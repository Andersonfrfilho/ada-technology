/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export type RecordFailureParams = {
  readonly agentId: string;
  readonly windowSeconds: number;
};

export type LockAgentParams = {
  readonly agentId: string;
  readonly seconds: number;
};
