/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/**
 * O contrato da API, e nao o da UI.
 *
 * Sao dois formatos parecidos e independentes: a API fala em `contactHandle` mascarado, a UI em
 * `contactId`. Copiar o tipo do pacote aqui esconderia a traducao que o mapper faz de proposito.
 */
export type PanelConversation = {
  readonly id: string;
  readonly contactId: string;
  readonly channel: 'webchat' | 'whatsapp';
  readonly contactHandle: string;
  readonly clientName?: string;
  readonly lastContent?: string;
  readonly lastDirection?: string;
  readonly lastAt: string;
  readonly lastInboundAt: string | null;
  readonly mode: string;
  readonly assignedUserId: string | null;
  readonly waitingHuman: boolean;
  readonly unread: number;
  readonly currentState: string;
};

export type PanelMessage = {
  readonly id: string;
  readonly type: string;
  readonly direction: string;
  readonly sender: string;
  readonly timestamp: string;
  readonly content?: string;
  readonly status?: string;
  readonly readAt?: string;
  readonly payload?: unknown;
  readonly moderation?: unknown;
  readonly transcription?: unknown;
};

export type PanelTranscript = {
  readonly transcript: string;
  readonly filename: string;
};
