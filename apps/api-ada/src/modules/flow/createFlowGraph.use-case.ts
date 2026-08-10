/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { FLOW_ACTION_KIND, type FlowGraphData } from '@adatechnology/meta-whatsapp-contracts';

import { ACTOR_TYPE, AUDIT_ACTION, AUDIT_TARGET } from '@/modules/audit/audit.constant';
import type { RecordAuditLogUseCase } from '@/modules/audit/recordAuditLog.use-case';
import { NEW_FLOW_START_NODE_ID } from '@/modules/flow/flow.constant';
import { FlowKeyAlreadyExistsError } from '@/modules/flow/flow.error';
import type { CreateFlowGraphParams, FlowGraphPort } from '@/modules/flow/types/flow.types';

type Dependencies = {
  readonly flows: FlowGraphPort;
  readonly recordAuditLog: RecordAuditLogUseCase;
};

/**
 * Fluxo novo nasce chamando uma pessoa, e nao com texto de exemplo.
 *
 * A chave existe antes do conteudo: entre criar e desenhar, um salto `flow:` ja alcanca este grafo.
 * Frase de placeholder viraria resposta real ao cliente; passar para o humano nunca mente.
 */
function buildInitialNodes(): FlowGraphData['nodes'] {
  return {
    [NEW_FLOW_START_NODE_ID]: {
      id: NEW_FLOW_START_NODE_ID,
      type: 'action',
      actionKind: FLOW_ACTION_KIND.HANDOFF,
    },
  };
}

export class CreateFlowGraphUseCase {
  constructor(private readonly dependencies: Dependencies) {}

  async execute({
    companyId,
    key,
    label,
    showInMenu,
    menuOptionLabel,
    agentId,
    ipAddress,
  }: CreateFlowGraphParams): Promise<FlowGraphData> {
    const existing = await this.dependencies.flows.get({ companyId, key });
    if (existing) throw new FlowKeyAlreadyExistsError(key);

    const created = await this.dependencies.flows.create({
      companyId,
      key,
      label,
      startNodeId: NEW_FLOW_START_NODE_ID,
      nodes: buildInitialNodes(),
      showInMenu,
      ...(menuOptionLabel ? { menuOptionLabel } : {}),
    });

    await this.dependencies.recordAuditLog.execute({
      actorType: ACTOR_TYPE.AGENT,
      actorId: agentId,
      action: AUDIT_ACTION.FLOW_CREATED,
      targetType: AUDIT_TARGET.FLOW,
      metadata: { flowKey: key, showInMenu },
      ...(ipAddress ? { ipAddress } : {}),
    });

    return created;
  }
}
