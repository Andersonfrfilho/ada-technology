/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export const WIDGET_TAG_NAME = 'ada-chat-widget';

/** Atributo obrigatorio: a origem da API muda por ambiente e nunca e chutada no codigo. */
export const API_BASE_ATTRIBUTE = 'api-base';

export const WIDGET_PATH = {
  SESSIONS: '/v1/widget/sessions',
  MESSAGES: (sessionId: string): string => `/v1/widget/sessions/${sessionId}/messages`,
  EVENTS: (sessionId: string): string => `/v1/widget/sessions/${sessionId}/events`,
} as const;

/**
 * A sessao vive na aba, nao no navegador.
 *
 * `sessionStorage` porque o id e uma capacidade: quem o tem le e escreve naquela conversa. Fechou a
 * aba, acabou — e uma maquina compartilhada nao entrega a conversa anterior para o proximo visitante.
 */
export const SESSION_STORAGE_KEY = 'ada:widget:session';

export const MESSAGE_DIRECTION = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
} as const;

/** Os dois desfechos em que o bot se cala e quem responde e uma pessoa. */
export const HANDOFF_OUTCOME: readonly string[] = ['handed-off', 'human'];

export const MESSAGE_TYPE = {
  TEXT: 'text',
  INTERACTIVE_LIST: 'interactive_list',
} as const;

/** A rota devolve as ultimas `limit` mensagens em ordem cronologica — o topo e a mais antiga delas. */
export const TRANSCRIPT_LIMIT = 50;

export const MESSAGE_MAX_LENGTH = 1_000;

/** Reconexao do SSE: o navegador ja reconecta sozinho, isto cobre a queda do servidor. */
export const SSE_RETRY_MS = 3_000;
