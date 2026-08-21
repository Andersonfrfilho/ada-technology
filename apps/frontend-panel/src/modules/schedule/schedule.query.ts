/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';

import {
  AGENTS_PATH,
  AGENTS_QUERY_KEY,
  APPOINTMENTS_PATH,
  APPOINTMENTS_QUERY_KEY,
  SCHEDULE_PATH,
  SCHEDULE_QUERY_KEY,
} from '@/modules/schedule/schedule.constant';
import type {
  Appointment,
  PanelAgent,
  Schedule,
} from '@/modules/schedule/types/schedule.types';
import { HTTP_METHOD } from '@/modules/shared/http/http.constant';
import { panelRequest } from '@/modules/shared/http/panelHttpClient';

export function useScheduleQuery(): UseQueryResult<Schedule> {
  return useQuery({
    queryKey: [SCHEDULE_QUERY_KEY],
    queryFn: () => panelRequest<Schedule>({ path: SCHEDULE_PATH }),
    refetchOnWindowFocus: false,
  });
}

export function useAgentsQuery(): UseQueryResult<readonly PanelAgent[]> {
  return useQuery({
    queryKey: [AGENTS_QUERY_KEY],
    queryFn: () => panelRequest<readonly PanelAgent[]>({ path: AGENTS_PATH }),
    refetchOnWindowFocus: false,
  });
}

export function useAppointmentsQuery(params: {
  readonly from: string;
  readonly to: string;
}): UseQueryResult<readonly Appointment[]> {
  return useQuery({
    queryKey: [APPOINTMENTS_QUERY_KEY, params],
    queryFn: () =>
      panelRequest<readonly Appointment[]>({ path: APPOINTMENTS_PATH, query: params }),
  });
}

export function useSaveScheduleMutation(): UseMutationResult<Schedule, Error, Schedule> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (schedule: Schedule) =>
      panelRequest<Schedule>({ path: SCHEDULE_PATH, method: HTTP_METHOD.PUT, body: schedule }),
    onSuccess: (saved) => queryClient.setQueryData([SCHEDULE_QUERY_KEY], saved),
  });
}

/**
 * Cancelar invalida a lista, e nao so a linha.
 *
 * O horario volta a ficar livre no mesmo instante, e quem estiver com a tela aberta precisa ver a
 * lista de novo — remendar so a linha cancelada esconderia isso.
 */
export function useCancelAppointmentMutation(): UseMutationResult<Appointment, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appointmentId: string) =>
      panelRequest<Appointment>({
        path: `${APPOINTMENTS_PATH}/${appointmentId}`,
        method: HTTP_METHOD.DELETE,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [APPOINTMENTS_QUERY_KEY] }),
  });
}
