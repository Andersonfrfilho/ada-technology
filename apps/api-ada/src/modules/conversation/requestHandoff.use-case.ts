/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import {
  CONVERSATION_MESSAGE,
  HANDOFF_REASON_CONTEXT_KEY,
} from '@/modules/conversation/conversation.constant';
import type {
  RequestHandoffDependencies,
  RequestHandoffParams,
} from '@/modules/conversation/types/conversation.types';
import { SESSION_MODE } from '@/shared/constants/domain.constant';
import { logger } from '@/shared/logger';

const SOURCE = 'RequestHandoffUseCase';

/**
 * Entrega a conversa a uma pessoa e cala o bot.
 *
 * E o unico desfecho para o que o grafo nao previu: o robo nao improvisa resposta, entao pergunta
 * fora do fluxo, fluxo ausente e no de acao de handoff terminam todos aqui.
 */
export class RequestHandoffUseCase {
  constructor(private readonly dependencies: RequestHandoffDependencies) {}

  async execute({ whatsappNumber, channel, reason }: RequestHandoffParams): Promise<void> {
    const { sessions, companyId } = this.dependencies;

    await sessions.requestHuman(companyId, whatsappNumber);

    // `requestHuman` so carimba o horario do pedido. Sem trocar o modo o bot continua respondendo
    // por cima do atendente na proxima mensagem do cliente.
    await sessions.setMode(companyId, whatsappNumber, SESSION_MODE.HUMAN);

    // Posicao zerada: quando o atendente devolver a conversa, ela recomeca do inicio em vez de
    // retomar uma pergunta que a pessoa ja respondeu por escrito para o humano.
    await sessions.setFlowPosition(companyId, whatsappNumber, null, null);

    await sessions.patchContext(companyId, whatsappNumber, { [HANDOFF_REASON_CONTEXT_KEY]: reason });

    await channel.sendText(whatsappNumber, CONVERSATION_MESSAGE.HANDOFF);

    logger.info({ source: SOURCE, message: 'conversation handed off', meta: { whatsappNumber, reason } });
  }
}
