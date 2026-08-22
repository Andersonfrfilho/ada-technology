/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { FlowActionRegistry } from '@adatechnology/meta-whatsapp-contracts';

import type { SchedulingAgenda } from '@/modules/scheduling/SchedulingAgenda';

/** Quem a conversa oferece: id do recurso, nome que o cliente le, e o fuso para formatar a hora. */
export type AgendaAttendant = {
  readonly id: string;
  readonly name: string;
  readonly timezone: string;
};

export type BookAgendaParams = {
  readonly sessionId: string;
  readonly resourceId: string;
  readonly startsAt: Date;
};

export type RegisterSchedulingFlowActionsParams = {
  readonly registry: FlowActionRegistry;
  readonly agenda: SchedulingAgenda;
};
