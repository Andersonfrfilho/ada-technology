/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import scheduleLocale from '@/modules/schedule/schedule.locale.json';
import type { ScheduleSettings } from '@/modules/schedule/types/schedule.types';

const locale = scheduleLocale.settings;

const FIELD =
  'w-full rounded-panel border border-gray-300 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white';
const LABEL = 'mb-1 block text-sm font-medium text-ink-900 dark:text-gray-200';
const HINT = 'mt-1 text-xs text-gray-500 dark:text-gray-400';

type ScheduleSettingsFormProps = {
  readonly settings: ScheduleSettings;
  readonly onChange: (patch: Partial<ScheduleSettings>) => void;
};

export function ScheduleSettingsForm({ settings, onChange }: ScheduleSettingsFormProps) {
  return (
    <fieldset className="rounded-panel border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <legend className="px-1 text-sm font-semibold text-ink-900 dark:text-white">
        {locale.title}
      </legend>

      <label className="flex items-center gap-3 py-2">
        <input
          checked={settings.isEnabled}
          className="size-5 accent-brand-600"
          onChange={(event) => onChange({ isEnabled: event.target.checked })}
          type="checkbox"
        />
        <span className="text-sm text-ink-900 dark:text-gray-200">{locale.isEnabled}</span>
      </label>
      <p className={HINT}>{locale.isEnabledHint}</p>

      <div className="mt-4 grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-4">
        <div>
          <label className={LABEL} htmlFor="timezone">
            {locale.timezone}
          </label>
          <input
            className={FIELD}
            id="timezone"
            onChange={(event) => onChange({ timezone: event.target.value })}
            value={settings.timezone}
          />
        </div>

        <NumberField
          id="slotMinutes"
          label={locale.slotMinutes}
          onChange={(slotMinutes) => onChange({ slotMinutes })}
          value={settings.slotMinutes}
        />

        <div>
          <NumberField
            id="minimumNoticeMinutes"
            label={locale.minimumNoticeMinutes}
            onChange={(minimumNoticeMinutes) => onChange({ minimumNoticeMinutes })}
            value={settings.minimumNoticeMinutes}
          />
          <p className={HINT}>{locale.minimumNoticeHint}</p>
        </div>

        <NumberField
          id="horizonDays"
          label={locale.horizonDays}
          onChange={(horizonDays) => onChange({ horizonDays })}
          value={settings.horizonDays}
        />
      </div>
    </fieldset>
  );
}

type NumberFieldProps = {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
};

function NumberField({ id, label, value, onChange }: NumberFieldProps) {
  return (
    <div>
      <label className={LABEL} htmlFor={id}>
        {label}
      </label>
      <input
        className={FIELD}
        id={id}
        min={0}
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        value={value}
      />
    </div>
  );
}
