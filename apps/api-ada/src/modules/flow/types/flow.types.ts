/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { FlowGraphData } from '@adatechnology/meta-whatsapp-contracts';

/**
 * O motor de fluxo do pacote, reduzido ao que estes use cases chamam.
 *
 * Declarar a forma em vez de importar as classes mantem a injecao por contrato: trocar o motor e
 * escrever outro objeto com estes tres metodos, sem tocar em quem os usa.
 */
export type FlowGraphPort = {
  get(params: { companyId: string; key: string }): Promise<FlowGraphData | undefined>;
  save(params: {
    companyId: string;
    graph: FlowGraphData;
    expectedVersion: number;
  }): Promise<FlowGraphData>;
  create(params: {
    companyId: string;
    key: string;
    label: string;
    startNodeId: string;
    nodes: FlowGraphData['nodes'];
    showInMenu?: boolean;
    menuOptionLabel?: string;
  }): Promise<FlowGraphData>;
  remove(params: { companyId: string; key: string }): Promise<void>;
};

/** Quem pediu a mudanca e de onde — o que a trilha de auditoria precisa saber alem do fluxo. */
type FlowActorParams = {
  readonly companyId: string;
  readonly agentId: string;
  readonly ipAddress?: string;
};

export type SaveFlowGraphParams = FlowActorParams & {
  readonly graph: FlowGraphData;
};

export type CreateFlowGraphParams = FlowActorParams & {
  readonly key: string;
  readonly label: string;
  readonly showInMenu: boolean;
  readonly menuOptionLabel?: string;
};

export type DeleteFlowGraphParams = FlowActorParams & {
  readonly key: string;
};
