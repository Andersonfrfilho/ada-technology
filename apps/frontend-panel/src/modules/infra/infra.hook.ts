/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';

import {
  getCosts,
  listEnvironments,
  powerOffEnvironment,
  powerOnEnvironment,
  saveSchedule,
} from '@/modules/infra/infra.api';
import {
  INFRA_COSTS_STALE_TIME_MS,
  INFRA_ENVIRONMENT_POWER_STATE,
  INFRA_POLL_INTERVAL_MS,
  INFRA_QUERY_KEY,
} from '@/modules/infra/infra.constant';
import type {
  InfraCosts,
  ListInfraEnvironmentsResult,
  PowerEnvironmentResult,
  PowerOffEnvironmentParams,
  PowerOnEnvironmentParams,
  SaveEnvironmentScheduleParams,
  SaveEnvironmentScheduleResult,
} from '@/modules/infra/types/infra.types';

/** Polling so enquanto ha operacao em curso: lista parada nao justifica uma chamada ao Railway a cada 15 s. */
export function shouldPollEnvironments(data: ListInfraEnvironmentsResult | undefined): boolean {
  if (!data) return false;

  return data.projects.some((project) =>
    project.environments.some(
      (environment) =>
        environment.runningOperationId !== undefined || environment.state === INFRA_ENVIRONMENT_POWER_STATE.TRANSITIONING,
    ),
  );
}

export function useInfraEnvironments(): UseQueryResult<ListInfraEnvironmentsResult> {
  return useQuery({
    queryKey: [INFRA_QUERY_KEY.ENVIRONMENTS],
    queryFn: listEnvironments,
    refetchInterval: (query) => (shouldPollEnvironments(query.state.data) ? INFRA_POLL_INTERVAL_MS : false),
  });
}

export function usePowerOffEnvironment(): UseMutationResult<PowerEnvironmentResult, Error, PowerOffEnvironmentParams> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: powerOffEnvironment,
    onSettled: () => queryClient.invalidateQueries({ queryKey: [INFRA_QUERY_KEY.ENVIRONMENTS] }),
  });
}

export function usePowerOnEnvironment(): UseMutationResult<PowerEnvironmentResult, Error, PowerOnEnvironmentParams> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: powerOnEnvironment,
    onSettled: () => queryClient.invalidateQueries({ queryKey: [INFRA_QUERY_KEY.ENVIRONMENTS] }),
  });
}

export function useSaveEnvironmentSchedule(): UseMutationResult<
  SaveEnvironmentScheduleResult,
  Error,
  SaveEnvironmentScheduleParams
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveSchedule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [INFRA_QUERY_KEY.ENVIRONMENTS] }),
  });
}

export function useInfraCosts(): UseQueryResult<InfraCosts> {
  return useQuery({
    queryKey: [INFRA_QUERY_KEY.COSTS],
    queryFn: getCosts,
    staleTime: INFRA_COSTS_STALE_TIME_MS,
  });
}
