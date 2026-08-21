/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { Plus, Trash2 } from 'lucide-react';

import { toMinuteOfDay, toTimeValue } from '@/modules/schedule/minutes.util';
import type { RangeKey } from '@/modules/schedule/schedule.hook';
import { WEEKDAYS } from '@/modules/schedule/schedule.constant';
import locale from '@/modules/schedule/schedule.locale.json';
import type { PanelAgent, WeeklyRule } from '@/modules/schedule/types/schedule.types';

const TIME_INPUT =
  'rounded-panel border border-gray-300 bg-white px-2 py-1 text-sm text-ink-900 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white';
const GHOST_BUTTON =
  'flex min-h-11 items-center gap-2 rounded-panel px-2 text-sm text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-gray-800';
const ICON_BUTTON =
  'flex size-11 items-center justify-center rounded-panel text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-gray-800';

type WeeklyGridProps = {
  readonly agents: readonly PanelAgent[];
  readonly rules: readonly WeeklyRule[];
  readonly onAdd: (params: { readonly agentId: string; readonly weekday: number }) => void;
  readonly onChange: (key: RangeKey, patch: Partial<WeeklyRule>) => void;
  readonly onRemove: (key: RangeKey) => void;
};

/**
 * Uma tabela por atendente, uma linha por dia da semana.
 *
 * Varias faixas no mesmo dia sao varias linhas de horario — e assim que o intervalo do almoco se
 * declara, sem um campo de pausa que so serviria para o caso de um intervalo so.
 */
export function WeeklyGrid({ agents, rules, onAdd, onChange, onRemove }: WeeklyGridProps) {
  if (agents.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{locale.grid.empty}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {agents.map((agent) => (
        <article
          className="rounded-panel border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
          key={agent.id}
        >
          <h3 className="mb-3 text-sm font-semibold text-ink-900 dark:text-white">{agent.name}</h3>

          <ul className="flex flex-col gap-2">
            {WEEKDAYS.map((weekday) => (
              <DayRow
                agentId={agent.id}
                key={weekday}
                onAdd={onAdd}
                onChange={onChange}
                onRemove={onRemove}
                ranges={rangesOf({ rules, agentId: agent.id, weekday })}
                weekday={weekday}
              />
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

type DayRowProps = {
  readonly agentId: string;
  readonly weekday: number;
  readonly ranges: readonly WeeklyRule[];
  readonly onAdd: (params: { readonly agentId: string; readonly weekday: number }) => void;
  readonly onChange: (key: RangeKey, patch: Partial<WeeklyRule>) => void;
  readonly onRemove: (key: RangeKey) => void;
};

function DayRow({ agentId, weekday, ranges, onAdd, onChange, onRemove }: DayRowProps) {
  const dayLabel = locale.weekdays[String(weekday) as keyof typeof locale.weekdays];

  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-gray-100 py-2 last:border-0 dark:border-gray-800">
      <span className="w-24 text-sm text-ink-900 dark:text-gray-200">{dayLabel}</span>

      {ranges.length === 0 ? (
        <span className="text-sm text-gray-400 dark:text-gray-500">{locale.grid.noRanges}</span>
      ) : null}

      {ranges.map((range, index) => (
        <span className="flex items-center gap-2" key={`${weekday}-${index}`}>
          <span className="text-xs text-gray-500 dark:text-gray-400">{locale.grid.from}</span>
          <input
            aria-label={`${dayLabel} — ${locale.grid.from}`}
            className={TIME_INPUT}
            onChange={(event) => {
              const startMinute = toMinuteOfDay(event.target.value);
              if (startMinute !== undefined) onChange({ agentId, weekday, index }, { startMinute });
            }}
            type="time"
            value={toTimeValue(range.startMinute)}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">{locale.grid.to}</span>
          <input
            aria-label={`${dayLabel} — ${locale.grid.to}`}
            className={TIME_INPUT}
            onChange={(event) => {
              const endMinute = toMinuteOfDay(event.target.value);
              if (endMinute !== undefined) onChange({ agentId, weekday, index }, { endMinute });
            }}
            type="time"
            value={toTimeValue(range.endMinute)}
          />
          <button
            aria-label={locale.grid.removeRange}
            className={ICON_BUTTON}
            onClick={() => onRemove({ agentId, weekday, index })}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </span>
      ))}

      <button className={GHOST_BUTTON} onClick={() => onAdd({ agentId, weekday })} type="button">
        <Plus aria-hidden="true" className="size-4" />
        {locale.grid.addRange}
      </button>
    </li>
  );
}

function rangesOf(params: {
  readonly rules: readonly WeeklyRule[];
  readonly agentId: string;
  readonly weekday: number;
}): readonly WeeklyRule[] {
  return params.rules.filter(
    (rule) => rule.agentId === params.agentId && rule.weekday === params.weekday,
  );
}
