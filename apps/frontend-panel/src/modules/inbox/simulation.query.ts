/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { IS_SIMULATION_AVAILABLE, SIMULATION_QUERY_KEY } from '@/modules/inbox/simulation.constant';
import type { SimulationCapabilities } from '@/modules/inbox/types/simulation.types';
import { PANEL_PATH } from '@/modules/shared/http/http.constant';
import { panelRequest } from '@/modules/shared/http/panelHttpClient';

/**
 * O que o ambiente sabe simular so muda com deploy da API.
 *
 * Por isso nunca envelhece dentro da sessao: refazer a chamada a cada foco de janela custaria uma
 * requisicao por alternancia de aba para uma resposta que e a mesma o dia inteiro.
 */
export function useSimulationCapabilitiesQuery(): UseQueryResult<SimulationCapabilities> {
  return useQuery({
    queryKey: SIMULATION_QUERY_KEY,
    queryFn: fetchSimulationCapabilities,
    enabled: IS_SIMULATION_AVAILABLE,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

function fetchSimulationCapabilities(): Promise<SimulationCapabilities> {
  return panelRequest<SimulationCapabilities>({ path: PANEL_PATH.SIMULATION });
}
