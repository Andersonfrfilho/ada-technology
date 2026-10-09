/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

type InfraPageHeaderProps = {
  readonly title: string;
  readonly subtitle: string;
};

export function InfraPageHeader({ title, subtitle }: InfraPageHeaderProps) {
  return (
    <header className="mb-4 space-y-0.5">
      <h1 className="text-lg font-semibold text-ink-900 dark:text-white">{title}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
    </header>
  );
}
