/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { sessions } from '@adatechnology/meta-whatsapp-module';
import { and, asc, count, desc, eq, or, sql, type SQL, type SQLWrapper } from 'drizzle-orm';

import { database } from '@/infra/database/client';
import { WIDGET_SESSION_ID_PATTERN } from '@/modules/channel/widget/widget.constant';
import { PANEL_CHANNEL, type PanelChannel } from '@/modules/panel/panel.constant';
import { toPanelLead } from '@/modules/panel/lead.mapper';
import {
  LEAD_CONTACT_FIELD,
  LEAD_INTEREST_FIELD,
  LEAD_NAME_FIELD,
} from '@/modules/panel/leadContext.field';
import {
  LEAD_SORT_FIELD,
  type LeadPage,
  type LeadSortField,
  type ListLeadsParams,
  type PanelLeadRepositoryInterface,
} from '@/modules/panel/types/lead.types';
import { LEAD_CONTEXT_KEY } from '@/shared/constants/domain.constant';

const NAME_FIELD = LEAD_NAME_FIELD;
const CONTACT_FIELD = LEAD_CONTACT_FIELD;
const INTEREST_FIELD = LEAD_INTEREST_FIELD;

/** `~` casa expressao regular no Postgres; o padrao vem do mesmo lugar que o gerador do id. */
const IS_WIDGET = sql`${sessions.whatsappNumber} ~ ${WIDGET_SESSION_ID_PATTERN}`;

/**
 * Sessao vira lead quando o visitante se identifica.
 *
 * Quem so leu o menu e saiu nao e cliente, e listar essas sessoes encheria a tela de linhas em
 * branco. Nome **ou** contato basta: o fluxo pergunta nos dois passos e a pessoa pode desistir no
 * meio — o que ela ja deu continua sendo o comeco de um atendimento.
 */
const IS_LEAD = or(sql`${NAME_FIELD} IS NOT NULL`, sql`${CONTACT_FIELD} IS NOT NULL`);

const SORT_COLUMN: Readonly<Record<LeadSortField, SQLWrapper>> = {
  [LEAD_SORT_FIELD.FIRST_CONTACT_AT]: sessions.createdAt,
  [LEAD_SORT_FIELD.LAST_ACTIVITY_AT]: sessions.lastActivity,
  [LEAD_SORT_FIELD.NAME]: NAME_FIELD,
};

export class DrizzlePanelLeadRepository implements PanelLeadRepositoryInterface {
  /**
   * Duas consultas de proposito: a pagina e o total.
   *
   * `count(*) OVER ()` na mesma consulta economizaria uma ida, mas obriga o Postgres a materializar
   * a contagem em cada linha da pagina; com filtro e indice parcial as duas leem o mesmo plano e a
   * segunda sai do cache.
   */
  async list(params: ListLeadsParams): Promise<LeadPage> {
    const where = and(eq(sessions.companyId, params.companyId), IS_LEAD, ...buildFilters(params));

    const rows = await database
      .select({
        id: sessions.id,
        whatsappNumber: sessions.whatsappNumber,
        name: NAME_FIELD,
        contact: CONTACT_FIELD,
        interest: INTEREST_FIELD,
        mode: sessions.mode,
        createdAt: sessions.createdAt,
        lastActivity: sessions.lastActivity,
      })
      .from(sessions)
      .where(where)
      .orderBy(orderBy(params))
      .limit(params.limit)
      .offset((params.page - 1) * params.limit);

    const [totals] = await database.select({ value: count() }).from(sessions).where(where);

    return {
      items: rows.map(toPanelLead),
      total: totals?.value ?? 0,
      page: params.page,
      perPage: params.limit,
    };
  }
}

function buildFilters({ channels, search }: ListLeadsParams): SQL[] {
  const filters: SQL[] = [];

  const channelFilter = toChannelFilter(channels);
  if (channelFilter) filters.push(channelFilter);

  // Busca so por nome e interesse: procurar por contato colocaria e-mail e telefone na query string.
  if (search) {
    const pattern = `%${search}%`;
    const matches = or(sql`${NAME_FIELD} ILIKE ${pattern}`, sql`${INTEREST_FIELD} ILIKE ${pattern}`);
    if (matches) filters.push(matches);
  }

  return filters;
}

/** Nenhum canal selecionado e os dois selecionados dizem a mesma coisa: nao filtre. */
function toChannelFilter(channels: readonly PanelChannel[]): SQL | undefined {
  const wantsWebchat = channels.includes(PANEL_CHANNEL.WEBCHAT);
  const wantsWhatsApp = channels.includes(PANEL_CHANNEL.WHATSAPP);

  if (wantsWebchat === wantsWhatsApp) return undefined;

  return wantsWebchat ? IS_WIDGET : sql`NOT ${IS_WIDGET}`;
}

function orderBy({ sortBy, sortDirection }: ListLeadsParams): SQL {
  const column = SORT_COLUMN[sortBy];

  return sortDirection === 'asc' ? asc(column) : desc(column);
}
