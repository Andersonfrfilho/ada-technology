/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/** Prefixo das rotas do modulo. Como no catalogo, o painel e o unico consumidor. */
export const SCHEDULING_BASE_PATH = '/v1/panel/scheduling';

/** Escopo do modulo esperado por `dispatchRoute` nas rotas de agenda. */
export const SCHEDULING_ADMIN_SCOPE = 'scheduling:admin';

/**
 * A janela e a tolerancia que o modulo aplica.
 *
 * `maxLookaheadDays` e teto de consulta, nao horizonte de oferta: quem pergunta a disponibilidade
 * de um ano inteiro varre a agenda a toa. O passado nao e perdoado em nenhum minuto — reserva
 * retroativa e sempre erro de quem chamou, nunca gentileza.
 */
export const SCHEDULING_MODULE_CONFIG = {
  maxLookaheadDays: 90,
  pastBookingToleranceMinutes: 0,
} as const;

/**
 * O servico unico do produto.
 *
 * A agenda daqui nao vende procedimento com duracao propria: e conversa com atendente. Um servico
 * so mantem a tela simples e ainda deixa o dia em que houver dois ser cadastro, nao migracao.
 */
export const SCHEDULING_DEFAULT_SERVICE = {
  name: 'Atendimento',
  durationMinutes: 30,
  requiresConfirmation: false,
} as const;

/** Fuso do recurso novo. O time e daqui; quem atende de outro lugar troca na tela. */
export const SCHEDULING_RESOURCE_TIMEZONE = 'America/Sao_Paulo';

/**
 * Ate onde a conversa procura horario.
 *
 * Bem menor que o teto de consulta do modulo de proposito: dez linhas e o que cabe numa lista do
 * WhatsApp, e oferecer o mes inteiro so faria o cliente escolher entre os dez primeiros mesmo.
 */
export const SCHEDULING_FLOW_HORIZON_DAYS = 7;

/** Teto de pagina do modulo. O time cabe numa pagina, e o provisionamento le tudo de uma vez. */
export const SCHEDULING_PROVISION_PAGE_SIZE = 100;

export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  CANCELED: 'canceled',
  COMPLETED: 'completed',
} as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];

export const MINUTES_IN_DAY = 24 * 60;

/**
 * O que a tela de configuracao mostra enquanto ninguem salvou nada.
 *
 * Fica em codigo porque a linha de `schedule_settings` so nasce no primeiro save, e uma agenda sem
 * configuracao nao pode significar "atende a qualquer hora": significa o horario comercial daqui.
 * Nasce desligada de proposito — o bot so oferece horario depois de alguem declarar a agenda.
 */
export const SCHEDULE_SETTINGS_DEFAULT = {
  timezone: 'America/Sao_Paulo',
  slotMinutes: 30,
  /** Ninguem marca para daqui a cinco minutos: o atendente precisa ver que chegou. */
  minimumNoticeMinutes: 120,
  horizonDays: 30,
  isEnabled: false,
} as const;

export const SCHEDULE_SETTINGS_LIMIT = {
  SLOT_MINUTES: { min: 10, max: 240 },
  MINIMUM_NOTICE_MINUTES: { min: 0, max: MINUTES_IN_DAY * 7 },
  HORIZON_DAYS: { min: 1, max: 180 },
} as const;

/**
 * Os tipos de acao que o grafo pode declarar para agendar.
 *
 * `FlowActionKind` e string no contrato do pacote, entao um tipo novo nasce aqui e nao numa
 * release de `@adatechnology/meta-whatsapp-contracts`.
 */
export const SCHEDULING_FLOW_ACTION_KIND = {
  LIST_AGENTS: 'list_schedule_agents',
  LIST_SLOTS: 'list_available_slots',
  BOOK: 'book_appointment',
} as const;

/**
 * O que a escolha dinamica deixa no contexto da sessao.
 *
 * A lista de pessoas e a de horarios sao montadas na hora, entao o no de pergunta seguinte nao tem
 * `options` — e sem as opcoes oferecidas guardadas, "2" ou o nome digitado nao teriam contra o que
 * casar. Sao ids e instantes, nunca dado pessoal do cliente.
 */
export const SCHEDULING_CONTEXT_KEY = {
  AGENT_ID: 'scheduleAgentId',
  AGENT_OPTIONS: 'scheduleAgentOptions',
  SLOT: 'scheduleSlot',
  SLOT_OPTIONS: 'scheduleSlotOptions',
} as const;

/** Para onde a acao manda a conversa quando nao ha o que oferecer, declarado pelo grafo. */
export const SCHEDULING_FLOW_PARAM = {
  UNAVAILABLE_NEXT: 'unavailableNext',
  RETRY_NEXT: 'retryNext',
} as const;

/**
 * Sem destino declarado a conversa termina aqui.
 *
 * `moveTo` trata destino vazio como fim de fluxo; devolver `undefined` faria o interpretador cair
 * no `next` do no, que e justamente o caminho feliz que nao pode ser seguido.
 */
export const SCHEDULING_FLOW_TERMINAL = '';

export const SCHEDULING_FLOW_MESSAGE = {
  AGENTS_QUESTION: 'Com quem você quer falar? 🗓️',
  AGENTS_BUTTON: 'Ver quem atende',
  SLOTS_QUESTION: 'Estes são os horários livres:',
  SLOTS_BUTTON: 'Ver horários',
  NO_AGENTS: 'A agenda ainda não está aberta por aqui — vou chamar alguém do time. 🙋',
  NO_SLOTS: 'Não encontrei horário livre nos próximos dias. Vou chamar alguém do time. 🙋',
  NOT_UNDERSTOOD: 'Não achei essa opção 😅 — toque em uma das que eu listei.',
  TAKEN: 'Esse horário acabou de ser preenchido 😕 — escolha outro na lista.',
  BOOKED: 'Prontinho! ✅ Agendamos para',
} as const;
