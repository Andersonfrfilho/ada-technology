/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { FlowGraphData } from '@adatechnology/meta-whatsapp-contracts';

import { ACTOR_TYPE, AUDIT_ACTION, AUDIT_TARGET } from '@/modules/audit/audit.constant';
import type { RecordAuditLogUseCase } from '@/modules/audit/recordAuditLog.use-case';
import { FlowVersionConflictError } from '@/modules/flow/flow.error';
import type { FlowGraphPort, SaveFlowGraphParams } from '@/modules/flow/types/flow.types';

type Dependencies = {
  readonly flows: FlowGraphPort;
  readonly recordAuditLog: RecordAuditLogUseCase;
};

/**
 * O nome e o unico identificador do erro de concorrencia do pacote.
 *
 * `OptimisticLockError` nao esta na superficie exportada, e sem esta conversao a edicao simultanea
 * cairia no filtro global como 500 — o editor diria "erro interno" onde o certo e "recarregue".
 */
const OPTIMISTIC_LOCK_ERROR_NAME = 'OptimisticLockError';

/**
 * Publica o grafo que o editor montou.
 *
 * O fluxo e o que o bot responde ao cliente, entao a troca deixa trilha com chave e versao. O grafo
 * em si nao entra na auditoria: ele ja esta versionado no banco, e a pergunta e quem publicou.
 */
export class SaveFlowGraphUseCase {
  constructor(private readonly dependencies: Dependencies) {}

  async execute({
    companyId,
    graph,
    agentId,
    ipAddress,
  }: SaveFlowGraphParams): Promise<FlowGraphData> {
    const saved = await this.saveWithLockGuard({ companyId, graph });

    // A chave do fluxo vai na metadata: `targetId` e coluna UUID, e fluxo e identificado por chave.
    await this.dependencies.recordAuditLog.execute({
      actorType: ACTOR_TYPE.AGENT,
      actorId: agentId,
      action: AUDIT_ACTION.FLOW_CHANGED,
      targetType: AUDIT_TARGET.FLOW,
      metadata: {
        flowKey: graph.key,
        version: saved.version,
        nodeCount: Object.keys(saved.nodes).length,
      },
      ...(ipAddress ? { ipAddress } : {}),
    });

    return saved;
  }

  private async saveWithLockGuard(params: {
    readonly companyId: string;
    readonly graph: FlowGraphData;
  }): Promise<FlowGraphData> {
    try {
      return await this.dependencies.flows.save({
        companyId: params.companyId,
        graph: params.graph,
        expectedVersion: params.graph.version,
      });
    } catch (error) {
      if (error instanceof Error && error.name === OPTIMISTIC_LOCK_ERROR_NAME) {
        throw new FlowVersionConflictError({
          flowKey: params.graph.key,
          expectedVersion: params.graph.version,
        });
      }

      throw error;
    }
  }
}
