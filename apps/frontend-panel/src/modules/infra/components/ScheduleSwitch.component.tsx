/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { useId } from 'react';

import infraLocale from '@/modules/infra/infra.locale.json';
import { INFRA_FOCUS_RING, INFRA_HINT } from '@/modules/infra/infraStyle.constant';

type ScheduleSwitchProps = {
  readonly isEnabled: boolean;
  readonly onChange: (isEnabled: boolean) => void;
};

/** Interruptor ativa/pausa; o texto muda junto com a posicao, entao o estado nao depende da cor. */
export function ScheduleSwitch({ isEnabled, onChange }: ScheduleSwitchProps) {
  const labelId = useId();

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          aria-checked={isEnabled}
          aria-labelledby={labelId}
          className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors motion-reduce:transition-none ${INFRA_FOCUS_RING} ${
            isEnabled
              ? 'border-brand-600 bg-brand-600 dark:border-brand-400 dark:bg-brand-500'
              : 'border-gray-400 bg-gray-200 dark:border-gray-500 dark:bg-gray-700'
          }`}
          onClick={() => onChange(!isEnabled)}
          role="switch"
          type="button"
        >
          <span
            aria-hidden="true"
            className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all motion-reduce:transition-none ${
              isEnabled ? 'left-6' : 'left-0.5'
            }`}
          />
        </button>
        <span className="text-sm font-medium text-ink-900 dark:text-gray-100" id={labelId}>
          {infraLocale.schedule.isEnabled}
          <span className="ml-2 font-normal text-gray-600 dark:text-gray-300">
            {isEnabled ? infraLocale.schedule.enabled : infraLocale.schedule.paused}
          </span>
        </span>
      </div>
      <p className={INFRA_HINT}>{infraLocale.schedule.isEnabledHint}</p>
    </div>
  );
}
