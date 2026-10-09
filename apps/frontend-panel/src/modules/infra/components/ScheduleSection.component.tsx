/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { ScheduleEditor } from '@/modules/infra/components/ScheduleEditor.component';
import infraLocale from '@/modules/infra/infra.locale.json';
import { INFRA_DISCLOSURE_SUMMARY, INFRA_FOCUS_RING } from '@/modules/infra/infraStyle.constant';
import type { InfraEnvironment } from '@/modules/infra/types/infra.types';

type ScheduleSectionProps = {
  readonly environment: InfraEnvironment;
};

function resolveScheduleSummary(environment: InfraEnvironment): string {
  if (!environment.schedule) return infraLocale.schedule.none;

  return environment.schedule.isEnabled ? infraLocale.schedule.enabled : infraLocale.schedule.paused;
}

export function ScheduleSection({ environment }: ScheduleSectionProps) {
  return (
    <details>
      <summary
        className={`${INFRA_DISCLOSURE_SUMMARY} ${INFRA_FOCUS_RING}`}
      >
        {infraLocale.schedule.title}
        <span className="ml-2 font-normal text-gray-600 dark:text-gray-300">{resolveScheduleSummary(environment)}</span>
      </summary>
      <div className="mt-3">
        <ScheduleEditor environment={environment} />
      </div>
    </details>
  );
}
