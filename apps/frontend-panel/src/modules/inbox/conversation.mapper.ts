/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { ConversationSummary, MessagePayload } from '@adatechnology/conversations-ui';

import { MESSAGE_TYPE, PANEL_CHANNEL } from '@/modules/inbox/inbox.constant';
import type { PanelConversation, PanelMessage } from '@/modules/inbox/types/inbox.types';

/**
 * O rotulo do contato entra como `contactId`.
 *
 * A UI monta o nome exibido a partir de `contactId ?? whatsappNumber` — e o numero real nunca sai da
 * API. No WhatsApp o rotulo ja vem mascarado (`****1234`) e `formatPhone` o devolve intacto por nao
 * conseguir formata-lo; no site entra o id opaco, que a UI mostra como "Visitante <6 digitos>".
 */
export function toConversationSummary(conversation: PanelConversation): ConversationSummary {
  const handle =
    conversation.channel === PANEL_CHANNEL.WEBCHAT ? conversation.id : conversation.contactHandle;

  return {
    id: conversation.id,
    whatsappNumber: handle,
    contactId: handle,
    channel: conversation.channel,
    lastAt: conversation.lastAt,
    lastInboundAt: conversation.lastInboundAt,
    mode: conversation.mode === 'human' ? 'human' : 'bot',
    assignedUserId: conversation.assignedUserId,
    waitingHuman: conversation.waitingHuman,
    unread: conversation.unread,
    currentState: conversation.currentState,
    ...(conversation.clientName ? { clientName: conversation.clientName } : {}),
    ...(conversation.lastContent ? { lastContent: conversation.lastContent } : {}),
    ...(conversation.lastDirection === 'inbound' || conversation.lastDirection === 'outbound'
      ? { lastDirection: conversation.lastDirection }
      : {}),
  };
}

export function toMessagePayload(message: PanelMessage): MessagePayload {
  const status = toStatus(message.status);

  return {
    id: message.id,
    type: toMessageType(message.type),
    direction: message.direction === 'outbound' ? 'outbound' : 'inbound',
    sender: toSender(message.sender),
    timestamp: message.timestamp,
    ...(message.content ? { content: message.content } : {}),
    ...(status ? { status } : {}),
    ...(message.readAt ? { readAt: message.readAt } : {}),
    ...(message.payload ? { payload: message.payload as NonNullable<MessagePayload['payload']> } : {}),
    ...(message.moderation
      ? { moderation: message.moderation as NonNullable<MessagePayload['moderation']> }
      : {}),
    ...(message.transcription
      ? { transcription: message.transcription as NonNullable<MessagePayload['transcription']> }
      : {}),
  };
}

const MESSAGE_TYPES: readonly string[] = Object.values(MESSAGE_TYPE);

/**
 * Tipo desconhecido vira texto.
 *
 * A API e a UI evoluem em ritmos diferentes; diante de um tipo que a UI nao conhece, mostrar o corpo
 * como texto perde o enfeite, e descartar a mensagem perderia a conversa.
 */
function toMessageType(type: string): MessagePayload['type'] {
  return MESSAGE_TYPES.includes(type) ? (type as MessagePayload['type']) : MESSAGE_TYPE.TEXT;
}

function toSender(sender: string): MessagePayload['sender'] {
  if (sender === 'agent') return 'agent';
  if (sender === 'bot') return 'bot';

  return 'customer';
}

const STATUSES: readonly string[] = ['sent', 'delivered', 'read', 'failed'];

function toStatus(status?: string): MessagePayload['status'] {
  return status !== undefined && STATUSES.includes(status)
    ? (status as MessagePayload['status'])
    : undefined;
}
