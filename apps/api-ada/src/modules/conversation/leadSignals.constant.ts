/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { z } from 'zod';

/**
 * Onde os sinais inferidos moram no contexto da sessao.
 *
 * Chave separada de `leadName`/`leadContact`/`leadInterest` de proposito: aquilo o cliente digitou,
 * isto um modelo deduziu. Misturar os dois faria o atendente ler um palpite como se fosse resposta,
 * e nao ha como desfazer essa confusao depois que ela entra no CRM.
 */
export const LEAD_SIGNALS_CONTEXT_KEY = '_leadSignals';

/** A extracao roda depois do passo do fluxo; passou disto, o sinal ja nao vale a espera. */
export const LEAD_SIGNALS_TIMEOUT_MS = 4_000;

/** Texto curto demais nao carrega sinal nenhum; so gastaria chamada de modelo por mensagem. */
export const LEAD_SIGNALS_MIN_TEXT_LENGTH = 40;

export const LEAD_SIGNAL_URGENCY = {
  IMMEDIATE: 'imediata',
  SHORT_TERM: 'curto_prazo',
  RESEARCHING: 'pesquisando',
} as const;

export const LEAD_SIGNAL_COMPANY_SIZE = {
  SOLO: 'solo',
  SMALL: 'pequena',
  MEDIUM: 'media',
  LARGE: 'grande',
} as const;

/**
 * O que vale a pena saber de um lead antes do primeiro contato humano.
 *
 * Nada aqui e dado sensivel: sem CPF, data de nascimento, renda ou endereco. Isso e limite da LGPD
 * e tambem de bom senso — o que a conversa nao precisa para agendar um retorno, nao se coleta.
 * Todo campo e opcional porque a ausencia de sinal e a resposta mais comum, e inventar valor para
 * preencher formulario e pior do que campo vazio.
 */
export const leadSignalsSchema = z.object({
  company: z.string().trim().max(120).optional(),
  role: z.string().trim().max(80).optional(),
  segment: z.string().trim().max(80).optional(),
  companySize: z.nativeEnum(LEAD_SIGNAL_COMPANY_SIZE).optional(),
  pain: z.string().trim().max(240).optional(),
  currentTools: z.array(z.string().trim().max(60)).max(5).optional(),
  urgency: z.nativeEnum(LEAD_SIGNAL_URGENCY).optional(),
});

export type LeadSignals = z.infer<typeof leadSignalsSchema>;

export const LEAD_SIGNALS_PROMPT = [
  'Voce extrai sinais comerciais de uma mensagem de um visitante de site.',
  'Responda SOMENTE um objeto JSON com as chaves opcionais:',
  'company (empresa), role (cargo), segment (ramo de atuacao),',
  `companySize (${Object.values(LEAD_SIGNAL_COMPANY_SIZE).join(' | ')}),`,
  'pain (a dor principal em uma frase curta), currentTools (array de sistemas citados),',
  `urgency (${Object.values(LEAD_SIGNAL_URGENCY).join(' | ')}).`,
  'Omita qualquer chave que a mensagem nao sustente. Nunca deduza alem do que foi dito.',
  'Nunca inclua CPF, data de nascimento, renda, endereco, telefone ou e-mail.',
].join(' ');
