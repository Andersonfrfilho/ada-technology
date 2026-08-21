/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export type ScheduleSettings = {
  readonly timezone: string;
  readonly slotMinutes: number;
  readonly minimumNoticeMinutes: number;
  readonly horizonDays: number;
  readonly isEnabled: boolean;
};

export type WeeklyRule = {
  readonly agentId: string;
  readonly weekday: number;
  readonly startMinute: number;
  readonly endMinute: number;
};

export type Schedule = {
  readonly settings: ScheduleSettings;
  readonly rules: readonly WeeklyRule[];
};

export type PanelAgent = {
  readonly id: string;
  readonly name: string;
  readonly role: string;
};

export type Appointment = {
  readonly id: string;
  readonly sessionId: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly status: string;
  readonly sourceChannel: string;
  readonly agentIds: readonly string[];
};
