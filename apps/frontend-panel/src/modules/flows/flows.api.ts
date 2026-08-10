/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type {
  CreateFlowInput,
  FlowGraphData,
  FlowsWorkspaceApi,
} from '@adatechnology/conversations-ui/flows';

import { HTTP_METHOD, PANEL_PATH } from '@/modules/shared/http/http.constant';
import { panelRequest } from '@/modules/shared/http/panelHttpClient';

function flowPath(key: string): string {
  return `${PANEL_PATH.FLOWS}/${encodeURIComponent(key)}`;
}

/**
 * A ponte entre o editor do pacote e as rotas do painel.
 *
 * `getLivePositions` fica de fora: a API devolve a contagem agregada por no, e o editor espera uma
 * linha por sessao. Sem o metodo os cards simplesmente nao pulsam — que e o comportamento previsto
 * pelo pacote, e melhor que inventar sessoes a partir de um numero.
 */
export const flowsApi: FlowsWorkspaceApi = {
  getGraphs: () => panelRequest<Record<string, FlowGraphData>>({ path: PANEL_PATH.FLOWS }),

  saveGraph: async (key: string, graph: FlowGraphData) => {
    await panelRequest<FlowGraphData>({
      path: flowPath(key),
      method: HTTP_METHOD.PUT,
      body: graph,
    });
  },

  createFlow: async (input: CreateFlowInput) => {
    await panelRequest<FlowGraphData>({
      path: PANEL_PATH.FLOWS,
      method: HTTP_METHOD.POST,
      body: input,
    });
  },

  deleteFlow: async (key: string) => {
    await panelRequest<void>({ path: flowPath(key), method: HTTP_METHOD.DELETE });
  },
};
