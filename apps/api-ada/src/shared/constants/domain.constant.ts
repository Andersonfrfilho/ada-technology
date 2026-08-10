/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export const CONVERSATION_CHANNEL = {
  WIDGET: 'widget',
  WHATSAPP: 'whatsapp',
} as const;
export type ConversationChannel = (typeof CONVERSATION_CHANNEL)[keyof typeof CONVERSATION_CHANNEL];

// Espelha meta_whatsapp.sessions.mode, que o modulo declara como varchar livre por nao conhecer
// a maquina de estados do produto. Escrever o literal aqui e o que mantem os dois lados juntos.
export const SESSION_MODE = {
  BOT: 'bot',
  HUMAN: 'human',
} as const;
export type SessionMode = (typeof SESSION_MODE)[keyof typeof SESSION_MODE];

export const MESSAGE_DIRECTION = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
} as const;
export type MessageDirection = (typeof MESSAGE_DIRECTION)[keyof typeof MESSAGE_DIRECTION];

export const MESSAGE_SENDER = {
  CUSTOMER: 'customer',
  BOT: 'bot',
  AGENT: 'agent',
} as const;
export type MessageSender = (typeof MESSAGE_SENDER)[keyof typeof MESSAGE_SENDER];

export const MESSAGE_TYPE = {
  TEXT: 'text',
  INTERACTIVE_LIST: 'interactive_list',
  IMAGE: 'image',
  DOCUMENT: 'document',
  AUDIO: 'audio',
  TEMPLATE: 'template',
} as const;
export type MessageType = (typeof MESSAGE_TYPE)[keyof typeof MESSAGE_TYPE];

export const LEAD_STATUS = {
  NEW: 'new',
  QUALIFIED: 'qualified',
  CONTACTED: 'contacted',
  WON: 'won',
  LOST: 'lost',
} as const;
export type LeadStatus = (typeof LEAD_STATUS)[keyof typeof LEAD_STATUS];

/**
 * Onde o grafo guarda o que o visitante contou sobre si.
 *
 * Mora aqui, e nao dentro do fluxo, porque quem grava e quem le sao modulos diferentes: o grafo
 * escreve durante a conversa e a tela de Clientes consulta depois. Chave divergente entre os dois
 * lados nao quebra nada em compile-time — a lista simplesmente vem vazia para sempre.
 */
export const LEAD_CONTEXT_KEY = {
  NAME: 'leadName',
  CONTACT: 'leadContact',
  INTEREST: 'leadInterest',
} as const;

export const AGENT_ROLE = {
  ADMIN: 'admin',
  AGENT: 'agent',
} as const;
export type AgentRole = (typeof AGENT_ROLE)[keyof typeof AGENT_ROLE];

export const HANDOFF_REASON = {
  CONTACT_REQUESTED: 'contact_requested',
  OUT_OF_FLOW: 'out_of_flow',
  FLOW_ACTION: 'flow_action',
  REPEATED_FALLBACK: 'repeated_fallback',
  /** Audio, foto ou documento: o grafo so sabe ler texto e opcao escolhida. */
  UNSUPPORTED_MESSAGE: 'unsupported_message',
} as const;
export type HandoffReason = (typeof HANDOFF_REASON)[keyof typeof HANDOFF_REASON];
