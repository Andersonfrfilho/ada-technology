/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { formatCheckedDate, resolveSafeUrl } from '@/modules/infra/costFormat.util';
import infraLocale from '@/modules/infra/infra.locale.json';
import { INFRA_FOCUS_RING } from '@/modules/infra/infraStyle.constant';

type CostFooterProps = {
  readonly pricingCheckedAt: string;
  readonly pricingSource: string;
};

export function CostFooter({ pricingCheckedAt, pricingSource }: CostFooterProps) {
  const sourceUrl = resolveSafeUrl(pricingSource);

  return (
    <footer className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
      <p>
        {infraLocale.costs.pricingCheckedAt} <time dateTime={pricingCheckedAt}>{formatCheckedDate(pricingCheckedAt)}</time>
      </p>
      <p>
        {infraLocale.costs.pricingSource}:{' '}
        {sourceUrl ? (
          <a
            className={`rounded underline ${INFRA_FOCUS_RING}`}
            href={sourceUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {pricingSource}
          </a>
        ) : (
          pricingSource
        )}
      </p>
    </footer>
  );
}
