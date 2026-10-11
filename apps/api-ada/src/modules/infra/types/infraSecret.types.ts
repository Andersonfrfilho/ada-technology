/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { INFRA_SECRET_UNREADABLE_REASON } from '@/modules/infra/infraSecret.constant';
import type { InfraSecretKey } from '@/modules/infra/infraSecretKey';

export type InfraSecretUnreadableReason =
  (typeof INFRA_SECRET_UNREADABLE_REASON)[keyof typeof INFRA_SECRET_UNREADABLE_REASON];

export type SealSecretParams = {
  readonly plaintext: string;
  readonly key: InfraSecretKey;
  readonly provider: string;
  readonly workspaceId: string;
};

export type OpenSecretParams = {
  readonly sealed: string;
  readonly key: InfraSecretKey;
  readonly provider: string;
  readonly workspaceId: string;
};
