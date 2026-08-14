/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { useMemo } from 'react';

import type { ConversationsWorkspaceSimulator } from '@adatechnology/conversations-ui';

import inboxLocale from '@/modules/inbox/inbox.locale.json';
import { useSimulationCapabilitiesQuery } from '@/modules/inbox/simulation.query';
import { simulationTransportsOf } from '@/modules/inbox/simulationTransports.factory';

/**
 * O simulador so existe quando o ambiente sabe entregar a mensagem por algum canal.
 *
 * Ausente e a forma de desligar: sem a prop, o workspace nao desenha o utilitario no cabecalho. Em
 * producao a resposta nem chega a ser pedida, e enquanto a lista de canais nao volta o botao fica
 * fora — melhor aparecer um instante depois que abrir num painel que erra ao ser tocado.
 */
export function useConversationSimulator(): ConversationsWorkspaceSimulator | undefined {
  const { data } = useSimulationCapabilitiesQuery();
  const channels = data?.channels;

  /** O pacote guarda o transporte da conversa aberta; recriar o mapa a cada render o reiniciaria. */
  const transports = useMemo(() => (channels ? simulationTransportsOf(channels) : undefined), [channels]);

  if (!transports) return undefined;

  return { transports, label: inboxLocale.simulator.label };
}
