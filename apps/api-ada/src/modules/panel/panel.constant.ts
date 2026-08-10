/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export const PANEL_CONVERSATION_DEFAULT_LIMIT = 30;
export const PANEL_CONVERSATION_MAX_LIMIT = 100;

export const PANEL_TRANSCRIPT_DEFAULT_LIMIT = 50;
export const PANEL_TRANSCRIPT_MAX_LIMIT = 100;

export const PANEL_DOCUMENTS_DEFAULT_LIMIT = 20;
export const PANEL_DOCUMENTS_MAX_LIMIT = 100;

export const PANEL_LEADS_DEFAULT_LIMIT = 20;
export const PANEL_LEADS_MAX_LIMIT = 100;

/** Resposta de atendente e mais longa que pergunta de visitante, mas ainda cabe numa mensagem. */
export const PANEL_MESSAGE_MAX_LENGTH = 4_000;

/**
 * Teto do arquivo exportado.
 *
 * Uma conversa de atendimento nao chega perto disso; o limite existe para que exportar nao vire uma
 * forma de puxar a base inteira para a memoria do processo.
 */
export const PANEL_TRANSCRIPT_EXPORT_LIMIT = 1_000;

/** Quem falou, do jeito que sai no arquivo. O papel basta: nome e telefone nao entram no export. */
export const TRANSCRIPT_SENDER_LABEL: Readonly<Record<string, string>> = {
  customer: 'Cliente',
  bot: 'Bot',
  agent: 'Atendente',
};

export const TRANSCRIPT_UNKNOWN_SENDER_LABEL = 'Desconhecido';

/**
 * Vocabulario de canal do `conversations-ui`, que nao e o do dominio.
 *
 * O pacote so conhece `whatsapp | messenger | instagram | webchat`, e `capabilitiesOf` cai no padrao
 * do WhatsApp diante de valor desconhecido: mandar `widget` daria ao visitante do site a janela de
 * 24h e o composer bloqueado depois dela. Quem cede e a borda — dentro da API o canal segue `widget`.
 */
export const PANEL_CHANNEL = {
  WEBCHAT: 'webchat',
  WHATSAPP: 'whatsapp',
} as const;

export type PanelChannel = (typeof PANEL_CHANNEL)[keyof typeof PANEL_CHANNEL];

const PANEL_CHANNELS: readonly string[] = Object.values(PANEL_CHANNEL);

export function isPanelChannel(value: string): value is PanelChannel {
  return PANEL_CHANNELS.includes(value);
}

/**
 * O bilhete vive o suficiente para o navegador abrir a conexao, e nada alem disso.
 *
 * `EventSource` nao manda header, entao o token de acesso nao viaja nesta rota. O bilhete e de uso
 * unico e sai no query string — o que o obriga a ser curto, porque query string vaza em log de proxy.
 */
export const SSE_TICKET_TTL_SECONDS = 30;
