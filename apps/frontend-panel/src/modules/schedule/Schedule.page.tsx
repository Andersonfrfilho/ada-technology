/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { Save } from 'lucide-react';

import { AppointmentTable } from '@/modules/schedule/components/AppointmentTable.component';
import { ScheduleSettingsForm } from '@/modules/schedule/components/ScheduleSettingsForm.component';
import { WeeklyGrid } from '@/modules/schedule/components/WeeklyGrid.component';
import { useAppointmentList } from '@/modules/schedule/appointmentList.hook';
import { useSchedule } from '@/modules/schedule/schedule.hook';
import locale from '@/modules/schedule/schedule.locale.json';
import {
  CONVERSATION_URL_KEY,
  PANEL_SECTION,
} from '@/modules/shared/navigation/panelSection.constant';
import { usePanelSection } from '@/modules/shared/navigation/panelSection.hook';

const STATE_MESSAGE = 'px-3 py-10 text-center text-sm text-gray-500 dark:text-gray-400';
const PRIMARY_BUTTON =
  'flex min-h-11 items-center justify-center gap-2 rounded-panel bg-brand-600 px-4 font-semibold text-white hover:bg-brand-500 disabled:opacity-60';

export function SchedulePage() {
  const schedule = useSchedule();
  const { navigate } = usePanelSection();
  const appointments = useAppointmentList();

  function handleOpenConversation(sessionId: string): void {
    navigate(PANEL_SECTION.CONVERSATIONS, { [CONVERSATION_URL_KEY]: sessionId });
  }

  if (schedule.isLoading) return <p className={STATE_MESSAGE}>{locale.loading}</p>;
  if (schedule.isError || !schedule.settings) {
    return <p className={STATE_MESSAGE}>{locale.loadError}</p>;
  }

  return (
    <section className="flex h-full flex-col gap-4 overflow-y-auto p-4 desktop:p-6">
      <header>
        <h1 className="text-lg font-semibold text-ink-900 dark:text-white">{locale.title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{locale.subtitle}</p>
      </header>

      <ScheduleSettingsForm onChange={schedule.changeSettings} settings={schedule.settings} />

      <h2 className="text-sm font-semibold text-ink-900 dark:text-white">{locale.grid.title}</h2>
      <WeeklyGrid
        agents={schedule.agents}
        onAdd={schedule.addRange}
        onChange={schedule.changeRange}
        onRemove={schedule.removeRange}
        rules={schedule.rules}
      />

      <div className="flex items-center gap-3">
        <button
          className={PRIMARY_BUTTON}
          disabled={schedule.isSaving}
          onClick={schedule.handleSave}
          type="button"
        >
          <Save aria-hidden="true" className="size-5" />
          {schedule.isSaving ? locale.saving : locale.save}
        </button>

        {schedule.saveError ? (
          <p className="text-sm text-red-600" role="alert">
            {locale.saveError}
          </p>
        ) : null}
        {schedule.isSaved && !schedule.saveError ? (
          <p className="text-sm text-green-700 dark:text-green-400">{locale.saved}</p>
        ) : null}
      </div>

      <h2 className="mt-2 text-sm font-semibold text-ink-900 dark:text-white">
        {locale.appointments.title}
      </h2>

      <div className="rounded-panel border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        {appointments.isLoading ? <p className={STATE_MESSAGE}>{locale.loading}</p> : null}
        {appointments.isError ? (
          <p className={STATE_MESSAGE}>{locale.appointments.loadError}</p>
        ) : null}
        {!appointments.isLoading && !appointments.isError && appointments.items.length === 0 ? (
          <p className={STATE_MESSAGE}>{locale.appointments.empty}</p>
        ) : null}

        {appointments.items.length > 0 ? (
          <AppointmentTable
            agents={schedule.agents}
            appointments={appointments.items}
            {...(appointments.cancelingId ? { cancelingId: appointments.cancelingId } : {})}
            onCancel={appointments.cancel}
            onOpenConversation={handleOpenConversation}
            timezone={schedule.settings.timezone}
          />
        ) : null}
      </div>
    </section>
  );
}
