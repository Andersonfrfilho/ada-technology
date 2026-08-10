/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/**
 * Nomes de canal do modulo, e nao deste produto.
 *
 * `LogMessageUseCase` publica em `conv:<numero>` e em `global` por conta propria. Quem quiser
 * ouvir precisa escrever exatamente a mesma string — por isso ela vive aqui, num lugar so, em vez
 * de ser reescrita no widget e no painel.
 */
export function conversationRealtimeChannel(conversationKey: string): string {
  return `conv:${conversationKey}`;
}

/** Onde o modulo avisa que algo mudou em alguma conversa, sem dizer qual. */
export const GLOBAL_REALTIME_CHANNEL = 'global';
