/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { database } from '@/infra/database/client';
import { auditLogs } from '@/infra/database/schema';
import type { RecordAuditLogParams } from '@/modules/audit/types/audit.types';

/**
 * Trilha de auditoria das acoes sensiveis: quem, o que, sobre quem, de onde e quando.
 *
 * Grava so identificador e rotulo. Nome, telefone e conteudo de mensagem ficam fora — a trilha
 * responde "quem assumiu a conversa X", nao "o que foi dito nela".
 */
export class RecordAuditLogUseCase {
  async execute({
    actorType,
    actorId,
    action,
    targetType,
    targetId,
    ipAddress,
    metadata,
  }: RecordAuditLogParams): Promise<void> {
    await database.insert(auditLogs).values({
      actorType,
      actorId: actorId ?? null,
      action,
      targetType,
      targetId: targetId ?? null,
      ipAddress: ipAddress ?? null,
      metadata: metadata ?? {},
    });
  }
}
