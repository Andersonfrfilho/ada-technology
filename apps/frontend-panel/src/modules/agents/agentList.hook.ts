/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { createAgent, listAgents, type AgentSummary } from '@/modules/agents/agents.api';
import { AGENTS_PATH } from '@/modules/agents/agents.constant';

const AGENTS_QUERY_KEY = [AGENTS_PATH] as const;

export type UseAgentListResult = {
  readonly agents: readonly AgentSummary[];
  readonly isLoading: boolean;
  readonly isCreating: boolean;
  readonly isFormOpen: boolean;
  readonly errorMessage?: string;
  readonly createdName?: string;
  openForm: () => void;
  closeForm: () => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

/**
 * Estado da tela de atendentes.
 *
 * O formulario le do `FormData` no submit, e nao de um `useState` por campo: sao quatro campos sem
 * validacao cruzada nem formatacao ao digitar, e um estado por campo aqui seria re-render a cada
 * tecla sem nada em troca.
 */
export function useAgentList(): UseAgentListResult {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [createdName, setCreatedName] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();

  const query = useQuery({ queryKey: AGENTS_QUERY_KEY, queryFn: listAgents });

  const mutation = useMutation({
    mutationFn: createAgent,
    onSuccess: async (created) => {
      setCreatedName(created.name);
      setErrorMessage(undefined);
      setIsFormOpen(false);
      // A lista vem do servidor, e nao de um `push` local: o papel normalizado e o id sao dele.
      await queryClient.invalidateQueries({ queryKey: AGENTS_QUERY_KEY });
    },
    onError: (error: unknown) => setErrorMessage(messageOf(error)),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    mutation.mutate({
      email: String(form.get('email') ?? ''),
      name: String(form.get('name') ?? ''),
      password: String(form.get('password') ?? ''),
      role: String(form.get('role') ?? 'agent'),
    });
  }

  return {
    agents: query.data ?? [],
    isLoading: query.isLoading,
    isCreating: mutation.isPending,
    isFormOpen,
    ...(errorMessage === undefined ? {} : { errorMessage }),
    ...(createdName === undefined ? {} : { createdName }),
    openForm: () => {
      setCreatedName(undefined);
      setErrorMessage(undefined);
      setIsFormOpen(true);
    },
    closeForm: () => setIsFormOpen(false),
    handleSubmit,
  };
}

/** O `message` do envelope de erro da API ja e legivel; erro sem ele vira texto generico. */
function messageOf(error: unknown): string | undefined {
  return error instanceof Error && error.message ? error.message : undefined;
}
