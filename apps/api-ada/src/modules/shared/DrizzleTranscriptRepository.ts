/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { type MessageRow, messages } from '@adatechnology/meta-whatsapp-module';
import { and, desc, eq, lt } from 'drizzle-orm';

import { database } from '@/infra/database/client';
import type {
  ListTranscriptMessagesParams,
  TranscriptRepositoryInterface,
} from '@/modules/shared/transcript.types';

export class DrizzleTranscriptRepository implements TranscriptRepositoryInterface {
  /**
   * Busca do mais novo para o mais velho e entrega ao contrario.
   *
   * A ordem invertida e do banco, para o corte pegar o fim da conversa; a tela e o arquivo exportado
   * leem de cima para baixo, entao a lista volta cronologica.
   */
  async listByConversation({
    companyId,
    sessionId,
    limit,
    before,
  }: ListTranscriptMessagesParams): Promise<MessageRow[]> {
    const conditions = [eq(messages.companyId, companyId), eq(messages.sessionId, sessionId)];
    if (before) conditions.push(lt(messages.createdAt, new Date(before)));

    const rows = await database
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    return rows.reverse();
  }
}
