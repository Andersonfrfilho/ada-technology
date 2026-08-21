/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { useMemo, useState } from 'react';

import { APPOINTMENTS_WINDOW_DAYS } from '@/modules/schedule/schedule.constant';
import {
  useAppointmentsQuery,
  useCancelAppointmentMutation,
} from '@/modules/schedule/schedule.query';
import type { Appointment } from '@/modules/schedule/types/schedule.types';

const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

/**
 * A janela e calculada uma vez por montagem.
 *
 * Sem o `useMemo` o `new Date()` produziria um `from` diferente a cada render, e a chave da query
 * mudaria junto — o que refaria a chamada em loop.
 */
export function useAppointmentList() {
  const window = useMemo(() => {
    const now = Date.now();

    return {
      from: new Date(now - APPOINTMENTS_WINDOW_DAYS.past * MILLISECONDS_IN_DAY).toISOString(),
      to: new Date(now + APPOINTMENTS_WINDOW_DAYS.future * MILLISECONDS_IN_DAY).toISOString(),
    };
  }, []);

  const query = useAppointmentsQuery(window);
  const cancelMutation = useCancelAppointmentMutation();
  const [cancelingId, setCancelingId] = useState<string | undefined>(undefined);

  function cancel(appointmentId: string): void {
    setCancelingId(appointmentId);
    cancelMutation.mutate(appointmentId, { onSettled: () => setCancelingId(undefined) });
  }

  return {
    items: (query.data ?? []) as readonly Appointment[],
    isLoading: query.isLoading,
    isError: query.isError,
    cancelingId,
    cancel,
  };
}
