/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { isWidgetSessionId } from '@/modules/channel/widget/widget.constant';
import { PANEL_CHANNEL, type PanelChannel } from '@/modules/panel/panel.constant';

/**
 * O canal sai da forma da chave, nao de uma coluna.
 *
 * A chave e o telefone no WhatsApp e o id de sessao no widget, e o id de sessao tem forma propria
 * (`w` + hex). Guardar o canal em separado abriria espaco para os dois discordarem.
 */
export function channelOfConversationKey(conversationKey: string): PanelChannel {
  return isWidgetSessionId(conversationKey) ? PANEL_CHANNEL.WEBCHAT : PANEL_CHANNEL.WHATSAPP;
}
