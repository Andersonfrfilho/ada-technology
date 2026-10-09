/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import infraLocale from '@/modules/infra/infra.locale.json';
import { INFRA_FOCUS_RING } from '@/modules/infra/infraStyle.constant';
import { WEEKDAY_INDEXES } from '@/modules/infra/infraUi.constant';

type WeekdayChipsProps = {
  readonly selectedWeekdays: readonly number[];
  readonly onToggle: (weekday: number) => void;
};

const CHIP_BASE = `size-10 rounded-full border text-sm font-semibold ${INFRA_FOCUS_RING}`;
const CHIP_ON = 'border-brand-600 bg-brand-600 text-white dark:border-brand-400 dark:bg-brand-500';
const CHIP_OFF = 'border-gray-300 bg-white text-ink-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100';

export function WeekdayChips({ selectedWeekdays, onToggle }: WeekdayChipsProps) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium text-ink-900 dark:text-gray-200">{infraLocale.schedule.weekdays}</legend>
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAY_INDEXES.map((weekday) => {
          const isSelected = selectedWeekdays.includes(weekday);

          return (
            <button
              aria-label={infraLocale.schedule.weekdayFullNames[weekday]}
              aria-pressed={isSelected}
              className={`${CHIP_BASE} ${isSelected ? CHIP_ON : CHIP_OFF}`}
              key={weekday}
              onClick={() => onToggle(weekday)}
              type="button"
            >
              {infraLocale.schedule.weekdayLetters[weekday]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
