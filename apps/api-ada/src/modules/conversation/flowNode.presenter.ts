/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { WHATSAPP_CHOICE_LIMIT } from '@adatechnology/meta-whatsapp-contracts';

import { MENU_BUTTON_LABEL } from '@/modules/conversation/conversation.constant';
import type { PresentFlowNodeParams } from '@/modules/conversation/types/conversation.types';

/**
 * Fala o no em que a conversa parou.
 *
 * O interpretador do modulo so calcula posicao — nao envia nada, e `directMessage`/`question` sao
 * campos que o contrato declara e o pacote nunca le. Sem esta etapa a conversa anda no banco e o
 * cliente ve silencio.
 */
export async function presentFlowNode({ node, to, channel, isRepeat }: PresentFlowNodeParams): Promise<void> {
  if (node.directMessage && !isRepeat) {
    await channel.sendText(to, node.directMessage);
  }

  const body = node.question ?? node.label;
  if (!body) return;

  const isChoice = node.type === 'menu' || node.questionType === 'choice';
  const options = node.options ?? [];
  if (!isChoice || options.length === 0) {
    await channel.sendText(to, body);
    return;
  }

  const choices = options.map(([id, title]) => ({ id, title }));

  /**
   * Poucas opcoes viram botao; muitas viram lista.
   *
   * A lista esconde a escolha atras de "Ver opcoes" e cobra um toque a mais para abrir — com duas
   * alternativas isso e atrito puro. O canal que nao implementa botao continua caindo na lista, que
   * e o que o WhatsApp fazia antes.
   */
  const sendButtons = channel.sendInteractiveButtons?.bind(channel);
  if (sendButtons && choices.length <= WHATSAPP_CHOICE_LIMIT.BUTTONS) {
    await sendButtons({ to, body, buttons: choices });
    return;
  }

  await channel.sendInteractiveList({ to, body, buttonLabel: MENU_BUTTON_LABEL, rows: choices });
}
