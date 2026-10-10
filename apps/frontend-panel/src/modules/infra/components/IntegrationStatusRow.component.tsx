/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { ReactNode } from 'react';

type IntegrationStatusRowProps = {
  readonly label: string;
  readonly children: ReactNode;
};

export function IntegrationStatusRow({ label, children }: IntegrationStatusRowProps) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-ink-900 dark:text-gray-100">{children}</dd>
    </div>
  );
}
