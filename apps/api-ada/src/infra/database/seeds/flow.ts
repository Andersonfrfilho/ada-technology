/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { closeRedis } from '@/infra/cache/redisClient';
import { environment } from '@/infra/config/environment';
import { flowGraphs } from '@/infra/container';
import { closeDatabase } from '@/infra/database/client';
import { DEFAULT_FLOW_GRAPH } from '@/modules/conversation/defaultFlow.constant';
import { logger } from '@/shared/logger';

const SOURCE = 'seed-flow';

/**
 * Publica o fluxo inicial, e so o inicial.
 *
 * Rodar de novo nao sobrescreve: depois da primeira publicacao o grafo passa a ser conteudo
 * editado pelo time no painel, e um seed que reescreve apaga esse trabalho a cada deploy.
 */
async function seedFlow(): Promise<void> {
  const companyId = environment.ADA_COMPANY_ID;
  const { key, label, startNodeId, nodes } = DEFAULT_FLOW_GRAPH;

  const existing = await flowGraphs.get.execute({ companyId, key });
  if (existing) {
    logger.info({
      message: 'Fluxo ja publicado, nada a fazer',
      source: SOURCE,
      meta: { flowKey: key, version: existing.version },
    });
    return;
  }

  const created = await flowGraphs.create.execute({ companyId, key, label, startNodeId, nodes });

  logger.info({
    message: 'Fluxo publicado',
    source: SOURCE,
    meta: { flowKey: created.key, version: created.version, nodeCount: Object.keys(created.nodes).length },
  });
}

// Fecha o Redis tambem: este seed monta o container inteiro para alcancar os use-cases de fluxo, e o
// subscriber do SseHub segura o event loop aberto — sem isso o comando publica o grafo e nunca sai.
try {
  await seedFlow();
} finally {
  await Promise.all([closeDatabase(), closeRedis()]);
}
