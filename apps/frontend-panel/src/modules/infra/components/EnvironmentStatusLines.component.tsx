/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { Clock, LoaderCircle, TimerReset } from 'lucide-react';

import infraLocale from '@/modules/infra/infra.locale.json';
import { formatMoment, formatNextScheduledAction } from '@/modules/infra/scheduledAction.util';
import type { InfraEnvironment } from '@/modules/infra/types/infra.types';
import { fillTemplate } from '@/modules/infra/zonedTime.util';

type EnvironmentStatusLinesProps = {
  readonly environment: InfraEnvironment;
};

const LINE = 'flex items-center gap-2 text-sm text-ink-900 dark:text-gray-100';

export function EnvironmentStatusLines({ environment }: EnvironmentStatusLinesProps) {
  const now = new Date();
  const { nextScheduledAction, schedule, runningOperationId } = environment;
  const keepOnUntil = schedule?.keepOnUntil ? new Date(schedule.keepOnUntil) : undefined;
  const isKeepOnActive = keepOnUntil !== undefined && keepOnUntil.getTime() > now.getTime();

  return (
    <div className="space-y-1.5">
      {runningOperationId !== undefined ? (
        <p className={`${LINE} font-medium`} role="status">
          <LoaderCircle aria-hidden="true" className="size-4 shrink-0 motion-safe:animate-spin" />
          {infraLocale.power.operationRunning}
        </p>
      ) : null}

      {nextScheduledAction ? (
        <p className={LINE}>
          <Clock aria-hidden="true" className="size-4 shrink-0 text-gray-600 dark:text-gray-300" />
          <span className="sr-only">{infraLocale.schedule.next}: </span>
          <span className="tabular-nums">{formatNextScheduledAction({ nextScheduledAction, now })}</span>
        </p>
      ) : null}

      {isKeepOnActive ? (
        <p className={LINE}>
          <TimerReset aria-hidden="true" className="size-4 shrink-0 text-gray-600 dark:text-gray-300" />
          <span className="tabular-nums">
            {fillTemplate({
              template: infraLocale.keepOn.activeUntil,
              values: { moment: formatMoment({ at: keepOnUntil, now }) },
            })}
          </span>
        </p>
      ) : null}
    </div>
  );
}
