/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/** Fluxo que abre toda conversa nova. O painel publica o grafo sob esta chave. */
export const DEFAULT_FLOW_KEY = 'atendimento';

/** Corte de seguranca do interpretador: grafo com ciclo de condicoes e publicavel hoje. */
export const MAX_FLOW_STEPS = 25;

/** Saltos `flow:` encadeados por mensagem. Acima disso o grafo se chama em circulo. */
export const MAX_CROSS_FLOW_JUMPS = 5;

/**
 * Tentativas fora do fluxo antes de chamar uma pessoa.
 *
 * O robo nao improvisa resposta: o que o grafo nao previu vira atendimento humano. Duas tentativas
 * cobrem o erro de digitacao sem transformar a conversa em interrogatorio.
 */
export const MAX_CONSECUTIVE_FALLBACKS = 2;

/** Chaves reservadas dentro do contexto da sessao, que tambem guarda os campos do fluxo. */
export const FALLBACK_COUNT_CONTEXT_KEY = '_fallbackCount';
export const HANDOFF_REASON_CONTEXT_KEY = '_handoffReason';

export const MENU_BUTTON_LABEL = 'Ver opções';

export const CONVERSATION_MESSAGE = {
  FALLBACK: 'Não entendi. Pode escolher uma das opções?',
  HANDOFF: 'Vou chamar alguém do nosso time para te ajudar. Em instantes respondemos por aqui.',
  CLOSING: 'Se precisar de mais alguma coisa, é só chamar.',
} as const;

export const CONVERSATION_OUTCOME = {
  /** O bot avancou e deixou uma pergunta no ar. */
  PRESENTED: 'presented',
  /** Resposta invalida: o bot reapresentou o no. */
  FALLBACK: 'fallback',
  /** A conversa passou para uma pessoa; o bot se cala. */
  HANDED_OFF: 'handed-off',
  /** O fluxo chegou ao fim. */
  COMPLETED: 'completed',
  /** Ja estava com um atendente antes desta mensagem. */
  HUMAN: 'human',
} as const;

export type ConversationOutcome = (typeof CONVERSATION_OUTCOME)[keyof typeof CONVERSATION_OUTCOME];
