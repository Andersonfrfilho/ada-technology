/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/** Espelha o vocabulario que a API ja traduz na borda — aqui so para decidir o rotulo do contato. */
export const PANEL_CHANNEL = {
  WEBCHAT: 'webchat',
  WHATSAPP: 'whatsapp',
} as const;

export const MESSAGE_TYPE = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  STICKER: 'sticker',
  TEMPLATE: 'template',
  INTERACTIVE: 'interactive',
} as const;

export const CONVERSATION_PATH = {
  MESSAGES: (conversationId: string) => `/v1/panel/conversations/${conversationId}/messages`,
  READ: (conversationId: string) => `/v1/panel/conversations/${conversationId}/read`,
  CONTEXT: (conversationId: string) => `/v1/panel/conversations/${conversationId}/context`,
  DOCUMENTS: (conversationId: string) => `/v1/panel/conversations/${conversationId}/documents`,
  TAKEOVER: (conversationId: string) => `/v1/panel/conversations/${conversationId}/takeover`,
  RELEASE: (conversationId: string) => `/v1/panel/conversations/${conversationId}/release`,
  TRANSCRIPT: (conversationId: string) => `/v1/panel/conversations/${conversationId}/transcript`,
  EVENTS: (conversationId: string) => `/v1/panel/conversations/${conversationId}/events`,
} as const;

/**
 * O painel nao entrega midia.
 *
 * Nao ha provedor de armazenamento configurado, entao nao existe rota que devolva o arquivo. Lancar
 * e melhor que devolver uma URL quebrada: a UI mostra a falha em vez de uma imagem que nunca carrega.
 */
export const MEDIA_UNSUPPORTED_MESSAGE = 'Envio e leitura de midia ainda nao estao disponiveis.';
