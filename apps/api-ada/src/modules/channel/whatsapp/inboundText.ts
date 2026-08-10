/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { WhatsAppMessage } from '@adatechnology/meta-whatsapp-contracts';

/**
 * O que o cliente "disse", na forma que o motor de conversa entende.
 *
 * Botao e lista devolvem o id da opcao, que e exatamente o que o validador de resposta espera —
 * o rotulo viria traduzido pelo aparelho e nao casaria com o grafo. Mensagem sem texto (audio,
 * foto, documento) devolve `undefined`: o bot nao tem como interpretar, e quem chama trata isso
 * como caso de atendimento humano.
 */
export function extractInboundText(message: WhatsAppMessage): string | undefined {
  const optionId = message.interactive?.list_reply?.id ?? message.interactive?.button_reply?.id;
  if (optionId) return optionId;

  const body = message.text?.body?.trim();

  return body && body.length > 0 ? body : undefined;
}
