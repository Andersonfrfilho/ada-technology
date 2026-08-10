/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { ChannelAdapterInterface } from '@adatechnology/meta-whatsapp-contracts';

import type { TranscribedWhatsAppChannelDependencies } from '@/modules/channel/whatsapp/types/whatsapp.types';
import { MESSAGE_DIRECTION, MESSAGE_SENDER, MESSAGE_TYPE } from '@/shared/constants/domain.constant';

/**
 * O adapter do modulo entrega a mensagem a Graph API e nao grava nada.
 *
 * Quem grava no modulo e `SendMessageUseCase`, que o bot nao usa: o grafo fala pelo
 * `ChannelAdapterInterface`. Sem esta camada o transcript do WhatsApp guardaria so o que o cliente
 * escreveu, e o atendente que assumisse a conversa leria perguntas sem as respostas do robo.
 *
 * O widget resolve o mesmo problema por dentro, no proprio adapter, porque la entregar e gravar sao
 * a mesma coisa (`WidgetChannelAdapter`).
 */
export class TranscribedWhatsAppChannel implements ChannelAdapterInterface {
  constructor(private readonly dependencies: TranscribedWhatsAppChannelDependencies) {}

  async sendText(to: string, body: string): Promise<{ externalMessageId: string | null }> {
    const result = await this.dependencies.channel.sendText(to, body);

    await this.log({ to, type: MESSAGE_TYPE.TEXT, content: body, waMessageId: result.externalMessageId });

    return result;
  }

  async sendInteractiveList(params: {
    to: string;
    body: string;
    buttonLabel: string;
    rows: { id: string; title: string }[];
  }): Promise<{ externalMessageId: string | null }> {
    const result = await this.dependencies.channel.sendInteractiveList(params);

    await this.log({
      to: params.to,
      type: MESSAGE_TYPE.INTERACTIVE_LIST,
      content: params.body,
      payload: { buttonLabel: params.buttonLabel, rows: params.rows },
      waMessageId: result.externalMessageId,
    });

    return result;
  }

  // O grafo nao envia midia nem template; delegar sem gravar manteria o transcript incompleto em
  // silencio, entao estas duas continuam sendo do modulo e do `SendMessageUseCase`, que ja grava.
  async sendMedia(
    params: Parameters<ChannelAdapterInterface['sendMedia']>[0],
  ): Promise<{ externalMessageId: string | null }> {
    return this.dependencies.channel.sendMedia(params);
  }

  async sendTemplate(
    params: Parameters<ChannelAdapterInterface['sendTemplate']>[0],
  ): Promise<{ externalMessageId: string | null }> {
    return this.dependencies.channel.sendTemplate(params);
  }

  async fetchMediaAsBase64(mediaId: string): Promise<{ data: string; mimeType: string }> {
    return this.dependencies.channel.fetchMediaAsBase64(mediaId);
  }

  private async log(params: {
    to: string;
    type: string;
    content: string;
    waMessageId: string | null;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    const { logMessage, companyId, startState } = this.dependencies;

    await logMessage.execute({
      companyId,
      whatsappNumber: params.to,
      direction: MESSAGE_DIRECTION.OUTBOUND,
      sender: MESSAGE_SENDER.BOT,
      type: params.type,
      content: params.content,
      waMessageId: params.waMessageId,
      startState,
      ...(params.payload ? { payload: params.payload } : {}),
    });
  }
}
