/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type {
  ConversationSession,
  MessageHookOutcome,
  WhatsAppMessage,
} from '@adatechnology/meta-whatsapp-contracts';

import { extractInboundText } from '@/modules/channel/whatsapp/inboundText';
import type { CreateWhatsAppMessageHookParams } from '@/modules/channel/whatsapp/types/whatsapp.types';
import { HANDOFF_REASON } from '@/shared/constants/domain.constant';

/** O modulo so age quando o host devolve `continue`; aqui o bot sempre respondeu. */
const HANDLED: MessageHookOutcome = { outcome: 'handled' };

/**
 * Porta de entrada do bot no WhatsApp.
 *
 * `ReceiveWebhookUseCase` devolve apenas contadores, entao a rota do webhook nao tem como acionar
 * o bot pelo retorno — este hook e a porta declarada pelo modulo, e ele ja nao e chamado quando a
 * conversa esta com um atendente.
 */
export function createWhatsAppMessageHook({
  resolveHandlers,
}: CreateWhatsAppMessageHookParams): (
  message: WhatsAppMessage,
  session: ConversationSession,
) => Promise<MessageHookOutcome> {
  return async (message, session) => {
    const { advanceConversation, requestHandoff, channel } = resolveHandlers();
    const text = extractInboundText(message);

    // Audio, foto ou documento: em vez de calar, a conversa vai para quem consegue abrir o arquivo.
    if (!text) {
      await requestHandoff.execute({
        whatsappNumber: session.whatsappNumber,
        channel,
        reason: HANDOFF_REASON.UNSUPPORTED_MESSAGE,
      });

      return HANDLED;
    }

    await advanceConversation.execute({
      whatsappNumber: session.whatsappNumber,
      text,
      channel,
    });

    return HANDLED;
  };
}
