/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { MessageRow } from '@adatechnology/meta-whatsapp-module';

import { isWidgetSessionId } from '@/modules/channel/widget/widget.constant';
import type {
  SendPanelMessageDependencies,
  SendPanelMessageParams,
} from '@/modules/panel/types/panel.types';
import { MESSAGE_DIRECTION, MESSAGE_SENDER, MESSAGE_TYPE } from '@/shared/constants/domain.constant';

/**
 * Mensagem escrita por uma pessoa, nos dois canais.
 *
 * Os caminhos sao diferentes porque os canais sao diferentes: no WhatsApp e preciso falar com a
 * Graph API e respeitar a janela de 24 horas da Meta, e `SendMessageUseCase` faz as duas coisas. No
 * widget nao existe janela nem terceiro — entregar e gravar sao o mesmo ato, e passar pelo mesmo
 * use-case gravaria a mensagem duas vezes.
 */
export class SendPanelMessageUseCase {
  constructor(private readonly dependencies: SendPanelMessageDependencies) {}

  async execute({ conversationId, text, agentId }: SendPanelMessageParams): Promise<MessageRow | undefined> {
    const { resolveConversation } = this.dependencies;
    const { conversationKey } = await resolveConversation.execute(conversationId);

    if (isWidgetSessionId(conversationKey)) return this.sendToWidget({ conversationKey, text, agentId });

    return this.sendToWhatsApp({ conversationKey, text, agentId });
  }

  private async sendToWidget(params: {
    conversationKey: string;
    text: string;
    agentId: string;
  }): Promise<MessageRow | undefined> {
    const { logMessage, companyId, startState } = this.dependencies;

    return logMessage.execute({
      companyId,
      whatsappNumber: params.conversationKey,
      direction: MESSAGE_DIRECTION.OUTBOUND,
      sender: MESSAGE_SENDER.AGENT,
      agentUserId: params.agentId,
      type: MESSAGE_TYPE.TEXT,
      content: params.text,
      startState,
    });
  }

  private async sendToWhatsApp(params: {
    conversationKey: string;
    text: string;
    agentId: string;
  }): Promise<MessageRow | undefined> {
    const { sendWhatsAppMessage, companyId, startState } = this.dependencies;

    return sendWhatsAppMessage.sendText({
      companyId,
      whatsappNumber: params.conversationKey,
      body: params.text,
      sender: MESSAGE_SENDER.AGENT,
      agentUserId: params.agentId,
      startState,
    });
  }
}
