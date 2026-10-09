/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { Database } from 'lucide-react';

import { INFRA_SERVICE_POWER_STATE } from '@/modules/infra/infra.constant';
import infraLocale from '@/modules/infra/infra.locale.json';
import { INFRA_DISCLOSURE_SUMMARY, INFRA_FOCUS_RING } from '@/modules/infra/infraStyle.constant';
import type { InfraService } from '@/modules/infra/types/infra.types';
import { fillTemplate } from '@/modules/infra/zonedTime.util';

type ServiceListProps = {
  readonly services: readonly InfraService[];
};

export function ServiceList({ services }: ServiceListProps) {
  const runningCount = services.filter((service) => service.powerState === INFRA_SERVICE_POWER_STATE.RUNNING).length;
  const summary = fillTemplate({
    template: infraLocale.services.summary,
    values: { running: String(runningCount), total: String(services.length) },
  });

  return (
    <details>
      <summary
        className={`${INFRA_DISCLOSURE_SUMMARY} ${INFRA_FOCUS_RING}`}
      >
        {infraLocale.services.title}
        <span className="ml-2 font-normal text-gray-600 tabular-nums dark:text-gray-300">{summary}</span>
      </summary>
      <ul className="mt-2 grid gap-1 tablet:grid-cols-2">
        {services.map((service) => (
          <li
            className="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-2.5 py-1.5 text-sm dark:bg-gray-800"
            key={service.serviceName}
          >
            <span className="flex min-w-0 items-center gap-1.5 text-ink-900 dark:text-gray-100">
              {service.isDatabase ? (
                <Database
                  aria-label={infraLocale.services.database}
                  className="size-4 shrink-0 text-gray-600 dark:text-gray-300"
                  role="img"
                />
              ) : null}
              <span className="truncate">{service.serviceName}</span>
            </span>
            <span className="shrink-0 text-xs text-gray-600 dark:text-gray-300">
              {infraLocale.services[service.powerState]}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
