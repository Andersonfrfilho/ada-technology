/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { CONVERSATION_COMMAND, CONVERSATION_COMMAND_SYNONYMS } from '@/modules/conversation/conversation.constant';
import type { ConversationCommand } from '@/modules/conversation/conversation.constant';

/** Acento, pontuacao e caixa somem: quem digita "Sair!" ou "início" quis o mesmo comando. */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Comandos que valem em qualquer ponto do grafo, sem estarem desenhados nele.
 *
 * A checagem so acontece depois que a resposta falha contra as opcoes do no, entao um grafo que ja
 * tenha uma opcao `voltar` continua mandando na propria palavra — o comando global e a rede embaixo,
 * nunca um sequestro do que o fluxo previu.
 */
export function resolveConversationCommand(text: string): ConversationCommand | undefined {
  const normalized = normalize(text);
  if (!normalized) return undefined;

  for (const command of Object.values(CONVERSATION_COMMAND)) {
    if (CONVERSATION_COMMAND_SYNONYMS[command].includes(normalized)) return command;
  }

  return undefined;
}
