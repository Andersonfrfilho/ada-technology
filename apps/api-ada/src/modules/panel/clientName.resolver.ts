/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { ConversationSummary } from '@adatechnology/meta-whatsapp-contracts';
import { sessions } from '@adatechnology/meta-whatsapp-module';
import { and, eq, inArray } from 'drizzle-orm';

import { database } from '@/infra/database/client';
import { LEAD_NAME_FIELD } from '@/modules/panel/leadContext.field';

/**
 * O nome que o cliente digitou, vindo do contexto da sessao para a lista de conversas.
 *
 * `ConversationSummary.clientName` existe no contrato e a UI o desenha em tres lugares — lista,
 * cabecalho e notificacao —, mas o `SessionRepository.list` do modulo nunca o projeta: sem isto toda
 * conversa do site aparece como "Visitante <6 digitos>", inclusive quem respondeu o nome no primeiro
 * no do fluxo. A chave de contexto (`leadName`) e vocabulario do produto, e nao do modulo, e e por
 * isso que a leitura mora aqui.
 *
 * Uma query para a pagina inteira, e nao uma por linha: a inbox lista dezenas de conversas, e o
 * proprio modulo evita N+1 nessa tela com subquery correlacionada — reintroduzi-lo do lado de fora
 * anularia o cuidado.
 */
export async function resolveClientNames({
  companyId,
  conversationKeys,
}: {
  readonly companyId: string;
  readonly conversationKeys: readonly string[];
}): Promise<ReadonlyMap<string, string>> {
  if (conversationKeys.length === 0) return new Map();

  const rows = await database
    .select({
      conversationKey: sessions.whatsappNumber,
      name: LEAD_NAME_FIELD,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.companyId, companyId),
        inArray(sessions.whatsappNumber, [...conversationKeys]),
      ),
    );

  return toClientNameMap(rows);
}

/**
 * O mapa, separado da busca, para poder ser testado sem banco.
 *
 * Nome em branco e o caso que importa: o cliente que apertou enter sem digitar nada gravaria `''` no
 * contexto, e um nome vazio na lista seria pior que o rotulo generico — a linha ficaria sem
 * identificacao nenhuma.
 */
export function toClientNameMap(
  rows: readonly { readonly conversationKey: string; readonly name: string | null }[],
): ReadonlyMap<string, string> {
  const names = new Map<string, string>();

  for (const row of rows) {
    const name = row.name?.trim();
    if (name) names.set(row.conversationKey, name);
  }

  return names;
}

/** O summary com o nome que a listagem do modulo nao traz. */
export function withClientName({
  summary,
  names,
}: {
  readonly summary: ConversationSummary;
  readonly names: ReadonlyMap<string, string>;
}): ConversationSummary {
  const name = names.get(summary.whatsappNumber);
  return name ? { ...summary, clientName: name } : summary;
}
