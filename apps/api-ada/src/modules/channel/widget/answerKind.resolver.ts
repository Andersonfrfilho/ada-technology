/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { FlowNodeData } from '@adatechnology/meta-whatsapp-contracts';

import { LEAD_CONTEXT_KEY } from '@/shared/constants/domain.constant';

/**
 * Que tipo de dado a pergunta corrente espera, para o navegador poder preencher sozinho.
 *
 * Sai do `contextKey` do no, e nao do enunciado: o texto e editavel no painel e amanha "como podemos
 * te chamar?" pode virar outra frase, enquanto a chave que guarda o nome continua a mesma. Sem isto,
 * o visitante digita nome, e-mail e telefone na mao no celular — que e onde a conversa se perde.
 */
const ANSWER_KIND_BY_CONTEXT_KEY: Readonly<Record<string, string>> = {
  [LEAD_CONTEXT_KEY.NAME]: 'name',
  [LEAD_CONTEXT_KEY.CONTACT]: 'contact',
} as const;

const ANSWER_KIND_BY_QUESTION_TYPE: Readonly<Record<string, string>> = {
  int: 'number',
  money: 'number',
  cpf: '',
} as const;

/** Escolha nao tem campo para preencher: quem responde clica no botao. */
export function resolveAnswerKind(node: FlowNodeData | undefined): string {
  if (!node || node.type !== 'question' || node.questionType === 'choice') return '';

  const byContext = node.contextKey ? ANSWER_KIND_BY_CONTEXT_KEY[node.contextKey] : undefined;
  if (byContext) return byContext;

  return (node.questionType ? ANSWER_KIND_BY_QUESTION_TYPE[node.questionType] : undefined) ?? '';
}
