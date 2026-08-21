/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { CONVERSATION_CHANNEL, type ConversationChannel } from '@/shared/constants/domain.constant';

/**
 * O canal por onde a conversa chegou, lido do proprio adapter.
 *
 * O adapter do WhatsApp vem do pacote e nunca vai declarar `channelKind`; por isso ele e o padrao,
 * e nao um caso de erro. Adapter novo que queira ser identificado so precisa declarar o campo.
 */
export function resolveSourceChannel(channel: unknown): ConversationChannel {
  const kind = (channel as { readonly channelKind?: unknown })?.channelKind;

  return kind === CONVERSATION_CHANNEL.WIDGET ? CONVERSATION_CHANNEL.WIDGET : CONVERSATION_CHANNEL.WHATSAPP;
}
