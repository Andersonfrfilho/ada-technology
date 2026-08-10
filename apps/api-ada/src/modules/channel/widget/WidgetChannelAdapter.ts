/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { ChannelAdapterInterface } from '@adatechnology/meta-whatsapp-contracts';

import { ChannelOperationUnsupportedError } from '@/modules/channel/channel.error';
import type { WidgetChannelAdapterDependencies } from '@/modules/channel/widget/types/widget.types';
import {
  CONVERSATION_CHANNEL,
  MESSAGE_DIRECTION,
  MESSAGE_SENDER,
  MESSAGE_TYPE,
} from '@/shared/constants/domain.constant';

/**
 * Transporte do widget do site.
 *
 * No WhatsApp o adapter fala com a Graph API e alguem mais grava no transcript. Aqui as duas
 * coisas sao a mesma: entregar ao navegador e escrever a mensagem e disparar o evento de tempo
 * real, que e exatamente o que `LogMessageUseCase` faz. O navegador reage ao evento buscando as
 * mensagens novas — o evento em si nao carrega texto, e nao deve carregar.
 *
 * Por isso este adapter NAO entra em `SendMessageUseCase`: aquele use-case tambem chama
 * `logMessage`, o que gravaria a mesma mensagem duas vezes, e ainda impoe a janela de 24h da
 * Meta, que nao existe em conversa de site.
 */
export class WidgetChannelAdapter implements ChannelAdapterInterface {
  constructor(private readonly dependencies: WidgetChannelAdapterDependencies) {}

  async sendText(to: string, body: string): Promise<{ externalMessageId: string | null }> {
    const { logMessage, companyId, startState } = this.dependencies;

    await logMessage.execute({
      companyId,
      whatsappNumber: to,
      direction: MESSAGE_DIRECTION.OUTBOUND,
      sender: MESSAGE_SENDER.BOT,
      type: MESSAGE_TYPE.TEXT,
      content: body,
      startState,
    });

    // Sem id externo: nao existe protocolo de terceiro para correlacionar, o id da linha basta.
    return { externalMessageId: null };
  }

  async sendInteractiveList(params: {
    to: string;
    body: string;
    buttonLabel: string;
    rows: { id: string; title: string }[];
  }): Promise<{ externalMessageId: string | null }> {
    const { logMessage, companyId, startState } = this.dependencies;

    await logMessage.execute({
      companyId,
      whatsappNumber: params.to,
      direction: MESSAGE_DIRECTION.OUTBOUND,
      sender: MESSAGE_SENDER.BOT,
      type: MESSAGE_TYPE.INTERACTIVE_LIST,
      content: params.body,
      payload: { buttonLabel: params.buttonLabel, rows: params.rows },
      startState,
    });

    return { externalMessageId: null };
  }

  async sendMedia(): Promise<{ externalMessageId: string | null }> {
    throw new ChannelOperationUnsupportedError('sendMedia', CONVERSATION_CHANNEL.WIDGET);
  }

  // Template e mecanismo da Meta para reabrir janela de 24h; conversa de site nao tem janela.
  async sendTemplate(): Promise<{ externalMessageId: string | null }> {
    throw new ChannelOperationUnsupportedError('sendTemplate', CONVERSATION_CHANNEL.WIDGET);
  }

  async fetchMediaAsBase64(): Promise<{ data: string; mimeType: string }> {
    throw new ChannelOperationUnsupportedError('fetchMediaAsBase64', CONVERSATION_CHANNEL.WIDGET);
  }
}
