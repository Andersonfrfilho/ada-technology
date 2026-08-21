/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { useEffect, useState } from 'react';

import { DEFAULT_WORKDAY } from '@/modules/schedule/schedule.constant';
import {
  useAgentsQuery,
  useSaveScheduleMutation,
  useScheduleQuery,
} from '@/modules/schedule/schedule.query';
import type {
  PanelAgent,
  ScheduleSettings,
  WeeklyRule,
} from '@/modules/schedule/types/schedule.types';

export type RangeKey = {
  readonly agentId: string;
  readonly weekday: number;
  readonly index: number;
};

/**
 * A grade inteira e editada como rascunho e salva de uma vez.
 *
 * Salvar faixa a faixa deixaria a agenda em estado intermediario publicado: entre o "tirei a sexta"
 * e o "coloquei a nova faixa" o bot ofereceria horario que ninguem quis oferecer.
 */
export function useSchedule() {
  const schedule = useScheduleQuery();
  const agents = useAgentsQuery();
  const save = useSaveScheduleMutation();

  const [settings, setSettings] = useState<ScheduleSettings | undefined>(undefined);
  const [rules, setRules] = useState<readonly WeeklyRule[]>([]);

  // Sincronizar com o servidor e o unico papel deste efeito: a carga chega depois do primeiro render.
  useEffect(() => {
    if (!schedule.data) return;

    setSettings(schedule.data.settings);
    setRules(schedule.data.rules);
  }, [schedule.data]);

  function changeSettings(patch: Partial<ScheduleSettings>): void {
    setSettings((current) => (current ? { ...current, ...patch } : current));
  }

  function addRange(params: { readonly agentId: string; readonly weekday: number }): void {
    setRules((current) => [...current, { ...params, ...DEFAULT_WORKDAY }]);
  }

  function changeRange(key: RangeKey, patch: Partial<WeeklyRule>): void {
    setRules((current) =>
      current.map((rule, index) => (index === indexOf({ current, key }) ? { ...rule, ...patch } : rule)),
    );
  }

  function removeRange(key: RangeKey): void {
    setRules((current) => current.filter((_rule, index) => index !== indexOf({ current, key })));
  }

  function handleSave(): void {
    if (!settings) return;

    save.mutate({ settings, rules });
  }

  return {
    settings,
    rules,
    agents: (agents.data ?? []) as readonly PanelAgent[],
    isLoading: schedule.isLoading || agents.isLoading,
    isError: schedule.isError || agents.isError,
    isSaving: save.isPending,
    saveError: save.isError,
    isSaved: save.isSuccess,
    changeSettings,
    addRange,
    changeRange,
    removeRange,
    handleSave,
  };
}

/** A tela enumera as faixas por atendente e dia; o array e unico, entao o indice precisa ser achado. */
function indexOf(params: { readonly current: readonly WeeklyRule[]; readonly key: RangeKey }): number {
  const positions = params.current
    .map((rule, index) => ({ rule, index }))
    .filter(
      ({ rule }) => rule.agentId === params.key.agentId && rule.weekday === params.key.weekday,
    );

  return positions[params.key.index]?.index ?? -1;
}
