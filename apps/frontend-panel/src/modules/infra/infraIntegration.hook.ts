/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { useEffect } from 'react';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { INFRA_QUERY_KEY } from '@/modules/infra/infra.constant';
import { getIntegration, removeIntegration, saveIntegration, verifyIntegration } from '@/modules/infra/infraIntegration.api';
import { INFRA_INTEGRATION_STALE_TIME_MS } from '@/modules/infra/infraIntegration.constant';
import type {
  InfraIntegrationView,
  RemoveInfraIntegrationParams,
  SaveInfraIntegrationParams,
  VerifyInfraIntegrationResult,
} from '@/modules/infra/types/infraIntegration.types';

/** Zero: o cache de mutacao guarda as variaveis (token e senha) e nao pode reter nenhuma depois de terminar. */
export const SENSITIVE_MUTATION_GC_TIME_MS = 0;

type SaveOptions = UseMutationOptions<InfraIntegrationView, Error, SaveInfraIntegrationParams>;
type RemoveOptions = UseMutationOptions<InfraIntegrationView, Error, RemoveInfraIntegrationParams>;
type VerifyOptions = UseMutationOptions<VerifyInfraIntegrationResult, Error, void>;

/** A integracao mudou: ambientes e custos da spec 001 dependem da credencial, entao saem do cache junto. */
export async function invalidateInfraQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: [INFRA_QUERY_KEY.INTEGRATION] }),
    queryClient.invalidateQueries({ queryKey: [INFRA_QUERY_KEY.ENVIRONMENTS] }),
    queryClient.invalidateQueries({ queryKey: [INFRA_QUERY_KEY.COSTS] }),
  ]);
}

export function buildSaveIntegrationOptions(queryClient: QueryClient): SaveOptions {
  return {
    mutationFn: saveIntegration,
    gcTime: SENSITIVE_MUTATION_GC_TIME_MS,
    onSettled: () => invalidateInfraQueries(queryClient),
  };
}

export function buildRemoveIntegrationOptions(queryClient: QueryClient): RemoveOptions {
  return {
    mutationFn: removeIntegration,
    gcTime: SENSITIVE_MUTATION_GC_TIME_MS,
    onSettled: () => invalidateInfraQueries(queryClient),
  };
}

export function buildVerifyIntegrationOptions(queryClient: QueryClient): VerifyOptions {
  return {
    mutationFn: verifyIntegration,
    onSettled: () => invalidateInfraQueries(queryClient),
  };
}

export function useInfraIntegration(): UseQueryResult<InfraIntegrationView> {
  return useQuery({
    queryKey: [INFRA_QUERY_KEY.INTEGRATION],
    queryFn: getIntegration,
    staleTime: INFRA_INTEGRATION_STALE_TIME_MS,
  });
}

export function useSaveInfraIntegration(): UseMutationResult<InfraIntegrationView, Error, SaveInfraIntegrationParams> {
  return useMutation(buildSaveIntegrationOptions(useQueryClient()));
}

export function useRemoveInfraIntegration(): UseMutationResult<InfraIntegrationView, Error, RemoveInfraIntegrationParams> {
  return useMutation(buildRemoveIntegrationOptions(useQueryClient()));
}

export function useVerifyInfraIntegration(): UseMutationResult<VerifyInfraIntegrationResult, Error, void> {
  return useMutation(buildVerifyIntegrationOptions(useQueryClient()));
}

/** Ao sair da tela o estado da mutacao (variaveis incluidas) e descartado, mesmo no meio de uma tentativa. */
export function useResetMutationOnUnmount(reset: () => void): void {
  useEffect(() => reset, [reset]);
}
