/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { ConversationSummary } from '@adatechnology/meta-whatsapp-contracts';
import type { MessageRow } from '@adatechnology/meta-whatsapp-module';

import { isWidgetSessionId } from '@/modules/channel/widget/widget.constant';
import { PANEL_CHANNEL, type PanelChannel } from '@/modules/panel/panel.constant';
import type { PanelConversation, PanelMessage } from '@/modules/panel/types/panel.types';
import { MESSAGE_TYPE } from '@/shared/constants/domain.constant';
import { maskPhoneNumber } from '@/shared/redaction';

/** O que a UI chama de `interactive`; o modulo grava com o nome do recurso da Meta. */
const PANEL_INTERACTIVE_TYPE = 'interactive';

const WIDGET_CONTACT_LABEL = 'Visitante do site';

type StoredInteractivePayload = {
  readonly buttonLabel?: string;
  readonly rows?: readonly { readonly id: string; readonly title: string }[];
};

/**
 * Linha da lista de conversas, sem o numero.
 *
 * O atendente responde pelo painel, entao o telefone nao tem uso na tela — e telefone em tela vira
 * telefone em captura de tela, em log de navegador e em ticket de suporte. O que identifica a
 * conversa nas chamadas seguintes e o `id`, que ja e opaco.
 */
export function toPanelConversation(summary: ConversationSummary): PanelConversation {
  const channel = channelOf(summary.whatsappNumber);

  return {
    id: summary.id,
    contactId: summary.id,
    channel,
    contactHandle: contactHandleOf({ channel, key: summary.whatsappNumber }),
    ...(summary.clientName ? { clientName: summary.clientName } : {}),
    ...(summary.lastContent ? { lastContent: summary.lastContent } : {}),
    ...(summary.lastDirection ? { lastDirection: summary.lastDirection } : {}),
    lastAt: summary.lastAt,
    lastInboundAt: summary.lastInboundAt,
    mode: summary.mode,
    assignedUserId: summary.assignedUserId,
    waitingHuman: summary.waitingHuman,
    unread: summary.unread,
    currentState: summary.currentState,
  };
}

/**
 * Mensagem no formato que o `conversations-ui` desenha.
 *
 * Listar campo a campo tambem e recorte: `companyId`, `sessionId` e `whatsappNumber` sao internos, e
 * coluna nova no modulo nao deve chegar ao navegador sem alguem decidir por isso.
 */
export function toPanelMessage(row: MessageRow): PanelMessage {
  return {
    id: row.id,
    type: row.type === MESSAGE_TYPE.INTERACTIVE_LIST ? PANEL_INTERACTIVE_TYPE : row.type,
    direction: row.direction,
    sender: row.sender,
    timestamp: row.createdAt.toISOString(),
    ...(row.content === null ? {} : { content: row.content }),
    ...(row.status ? { status: row.status } : {}),
    ...(row.readAt ? { readAt: row.readAt.toISOString() } : {}),
    ...toInteractivePayload(row),
    ...toModeration(row),
    ...toTranscription(row),
  };
}

function channelOf(conversationKey: string): PanelChannel {
  return isWidgetSessionId(conversationKey) ? PANEL_CHANNEL.WEBCHAT : PANEL_CHANNEL.WHATSAPP;
}

function contactHandleOf({ channel, key }: { channel: PanelChannel; key: string }): string {
  return channel === PANEL_CHANNEL.WEBCHAT ? WIDGET_CONTACT_LABEL : maskPhoneNumber(key);
}

/**
 * O menu guardado vira o formato de lista interativa que a UI conhece.
 *
 * Sem esta traducao o balao ficaria vazio: a UI le `action.sections[].rows[]`, e os dois canais
 * gravam `{ buttonLabel, rows }`, que e o vocabulario do adapter.
 */
function toInteractivePayload(row: MessageRow): Pick<PanelMessage, 'payload'> {
  if (row.type !== MESSAGE_TYPE.INTERACTIVE_LIST) return {};

  const stored = (row.payload ?? {}) as StoredInteractivePayload;

  return {
    payload: {
      type: 'list',
      ...(row.content === null ? {} : { body: { text: row.content } }),
      action: {
        ...(stored.buttonLabel ? { button: stored.buttonLabel } : {}),
        sections: [{ rows: [...(stored.rows ?? [])] }],
      },
    },
  };
}

/** Ausente e diferente de avaliado e limpo: so manda o veredito quando a moderacao rodou. */
function toModeration(row: MessageRow): Pick<PanelMessage, 'moderation'> {
  if (row.moderationFlagged === null) return {};

  return {
    moderation: { isOffensive: row.moderationFlagged, terms: [...(row.moderationTerms ?? [])] },
  };
}

function toTranscription(row: MessageRow): Pick<PanelMessage, 'transcription'> {
  if (!row.transcriptionStatus) return {};

  return {
    transcription: {
      status: row.transcriptionStatus,
      ...(row.transcriptionText ? { text: row.transcriptionText } : {}),
      ...(row.transcriptionLanguage ? { language: row.transcriptionLanguage } : {}),
      ...(row.transcriptionEngine ? { engine: row.transcriptionEngine } : {}),
    },
  };
}
