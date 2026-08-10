/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { sessions } from '@adatechnology/meta-whatsapp-module';
import { and, eq } from 'drizzle-orm';

import { database } from '@/infra/database/client';
import type {
  ConversationRef,
  FindConversationParams,
  PanelConversationRepositoryInterface,
} from '@/modules/panel/types/panel.types';

/**
 * Traduz o id opaco da conversa na chave com que o modulo a guarda.
 *
 * `SessionRepository` e inteiramente indexado por `(companyId, whatsappNumber)` e nao oferece busca
 * por id — por isso a consulta e escrita aqui, sobre o schema que o modulo exporta justamente para
 * o host poder consultar. O `companyId` entra no `where` sempre: e o que impede um id de outra
 * empresa de virar uma chave valida.
 */
export class DrizzlePanelConversationRepository implements PanelConversationRepositoryInterface {
  async findById({ companyId, conversationId }: FindConversationParams): Promise<ConversationRef | undefined> {
    const [row] = await database
      .select({ id: sessions.id, whatsappNumber: sessions.whatsappNumber })
      .from(sessions)
      .where(and(eq(sessions.id, conversationId), eq(sessions.companyId, companyId)))
      .limit(1);

    if (!row) return undefined;

    return { conversationId: row.id, conversationKey: row.whatsappNumber };
  }
}
