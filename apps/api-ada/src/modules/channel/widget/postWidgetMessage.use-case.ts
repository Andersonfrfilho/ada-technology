/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type {
  PostWidgetMessageDependencies,
  PostWidgetMessageParams,
  PostWidgetMessageResult,
} from '@/modules/channel/widget/types/widget.types';
import {
  MESSAGE_DIRECTION,
  MESSAGE_SENDER,
  MESSAGE_TYPE,
} from '@/shared/constants/domain.constant';

/**
 * Mensagem do visitante do site.
 *
 * No WhatsApp o proprio modulo grava a mensagem recebida antes de chamar o hook. Aqui nao ha
 * webhook, entao gravar o que o visitante disse e responsabilidade desta camada — sem isso o
 * transcript mostraria so o lado do bot, e o atendente que assumisse a conversa leria pela metade.
 */
export class PostWidgetMessageUseCase {
  constructor(private readonly dependencies: PostWidgetMessageDependencies) {}

  async execute({ sessionId, text }: PostWidgetMessageParams): Promise<PostWidgetMessageResult> {
    const { logMessage, advanceConversation, channel, companyId, startState } = this.dependencies;

    await logMessage.execute({
      companyId,
      whatsappNumber: sessionId,
      direction: MESSAGE_DIRECTION.INBOUND,
      sender: MESSAGE_SENDER.CUSTOMER,
      type: MESSAGE_TYPE.TEXT,
      content: text,
      startState,
    });

    return advanceConversation.execute({ whatsappNumber: sessionId, text, channel });
  }
}
