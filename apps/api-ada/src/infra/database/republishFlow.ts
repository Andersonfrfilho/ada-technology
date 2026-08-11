/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { ACTOR_TYPE, AUDIT_ACTION, AUDIT_TARGET } from '@/modules/audit/audit.constant';
import { closeRedis } from '@/infra/cache/redisClient';
import { environment } from '@/infra/config/environment';
import { flowGraphs, recordAuditLog } from '@/infra/container';
import { closeDatabase } from '@/infra/database/client';
import { DEFAULT_FLOW_GRAPH } from '@/modules/conversation/defaultFlow.constant';
import { parseFlowGraph } from '@/modules/flow/flow.schema';
import { logger } from '@/shared/logger';

const SOURCE = 'republish-flow';
const CONFIRM_FLAG = '--confirm';

/**
 * Sobe o grafo do codigo por cima do que esta publicado, como versao nova.
 *
 * O seed nunca sobrescreve — e por isso que ele nao serve aqui: depois da primeira publicacao, uma
 * correcao de texto feita em PR nao chegaria a producao por nenhum caminho a nao ser alguem repetir
 * a edicao a mao no painel de cada ambiente.
 *
 * **Exige `--confirm` porque o painel e a via normal.** Quem editou o texto pelo fluxograma perde a
 * edicao quando este comando roda, entao a substituicao nao pode acontecer por acidente num script
 * de deploy. A versao anterior continua no historico do banco, e a troca deixa trilha de auditoria
 * como acao de sistema.
 */
async function republishFlow(): Promise<void> {
  const companyId = environment.ADA_COMPANY_ID;
  const graph = parseFlowGraph(DEFAULT_FLOW_GRAPH);

  const existing = await flowGraphs.get.execute({ companyId, key: graph.key });
  if (!existing) {
    const created = await flowGraphs.create.execute({
      companyId,
      key: graph.key,
      label: graph.label,
      startNodeId: graph.startNodeId,
      nodes: graph.nodes,
    });
    await recordChange({ flowKey: created.key, version: created.version });
    logger.info({ message: 'Fluxo publicado pela primeira vez', source: SOURCE, meta: { flowKey: created.key } });
    return;
  }

  if (!process.argv.includes(CONFIRM_FLAG)) {
    logger.warn({
      message: `Fluxo ja publicado — rode com ${CONFIRM_FLAG} para substituir a versao do painel`,
      source: SOURCE,
      meta: { flowKey: graph.key, publishedVersion: existing.version },
    });
    return;
  }

  const saved = await flowGraphs.save.execute({
    companyId,
    graph: { ...graph, version: existing.version },
    expectedVersion: existing.version,
  });

  await recordChange({ flowKey: saved.key, version: saved.version });
  logger.info({
    message: 'Fluxo republicado a partir do codigo',
    source: SOURCE,
    meta: { flowKey: saved.key, previousVersion: existing.version, version: saved.version },
  });
}

function recordChange(params: { flowKey: string; version: number }): Promise<unknown> {
  return recordAuditLog.execute({
    actorType: ACTOR_TYPE.SYSTEM,
    action: AUDIT_ACTION.FLOW_CHANGED,
    targetType: AUDIT_TARGET.FLOW,
    metadata: { flowKey: params.flowKey, version: params.version, source: SOURCE },
  });
}

// Mesmo motivo do seed: o container inteiro sobe para alcancar o motor de fluxo, e o subscriber do
// SseHub segura o event loop aberto — sem fechar Redis o comando publica e nunca sai.
try {
  await republishFlow();
} finally {
  await Promise.all([closeDatabase(), closeRedis()]);
}
