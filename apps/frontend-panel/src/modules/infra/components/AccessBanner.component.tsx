/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { CircleAlert, Info } from 'lucide-react';

import { INFRA_ACCESS_STATUS, type InfraAccessStatus } from '@/modules/infra/infra.constant';
import infraLocale from '@/modules/infra/infra.locale.json';

type AccessBannerProps = {
  readonly access: InfraAccessStatus;
};

export function AccessBanner({ access }: AccessBannerProps) {
  if (access === INFRA_ACCESS_STATUS.TOKEN_INVALID) {
    return (
      <p
        className="mb-4 flex items-start gap-2 rounded-panel border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        role="alert"
      >
        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {infraLocale.access.token_invalid}
      </p>
    );
  }

  if (access === INFRA_ACCESS_STATUS.BILLING_UNAVAILABLE) {
    return (
      <p
        className="mb-4 flex items-start gap-2 rounded-panel border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
        role="status"
      >
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {infraLocale.access.billing_unavailable}
      </p>
    );
  }

  return null;
}
