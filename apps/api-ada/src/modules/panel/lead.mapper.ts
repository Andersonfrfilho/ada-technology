/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { isWidgetSessionId } from '@/modules/channel/widget/widget.constant';
import { PANEL_CHANNEL } from '@/modules/panel/panel.constant';
import type { PanelLead } from '@/modules/panel/types/lead.types';
import { SESSION_MODE } from '@/shared/constants/domain.constant';

/** A linha crua da sessao, ja recortada pela consulta — o telefone entra so para decidir o canal. */
export type LeadRow = {
  readonly id: string;
  readonly whatsappNumber: string;
  readonly name: string | null;
  readonly contact: string | null;
  readonly email: string | null;
  readonly interest: string | null;
  readonly mode: string;
  readonly createdAt: Date;
  readonly lastActivity: Date;
};

/**
 * O numero fica na consulta e nao sobe.
 *
 * Ele entra aqui so para dizer de qual canal o cliente veio, e sai como `channel`. O que identifica o
 * lead nas chamadas seguintes e o `conversationId`, que ja e opaco e e o mesmo id da conversa — e por
 * ele que a tela abre o atendimento de onde o lead nasceu.
 */
export function toPanelLead(row: LeadRow): PanelLead {
  return {
    conversationId: row.id,
    name: row.name,
    contact: row.contact,
    email: row.email,
    interest: row.interest,
    channel: isWidgetSessionId(row.whatsappNumber) ? PANEL_CHANNEL.WEBCHAT : PANEL_CHANNEL.WHATSAPP,
    firstContactAt: row.createdAt.toISOString(),
    lastActivityAt: row.lastActivity.toISOString(),
    waitingHuman: row.mode === SESSION_MODE.HUMAN,
  };
}
