/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { FlowNodeData } from '@adatechnology/meta-whatsapp-contracts';

import type { FlowAnswerValidation, ValidateFlowAnswerParams } from '@/modules/conversation/types/conversation.types';

/**
 * Decide se a mensagem do cliente responde o no em que a conversa parou.
 *
 * O interpretador do modulo nao valida nada: qualquer texto numa pergunta de multipla escolha cai
 * no ramo `default` e a conversa segue como se tivesse sido entendida. Como neste produto o robo
 * nao improvisa resposta, e aqui que se separa "respondeu" de "falou outra coisa" — e o segundo
 * caso e o que vira atendimento humano.
 */
const CPF_LENGTH = 11;
const CPF_FIRST_DIGIT_WEIGHT = 10;
const CPF_SECOND_DIGIT_WEIGHT = 11;
const MONEY_DECIMALS = 2;
const DATE_PATTERN = /^(\d{2})[/-](\d{2})[/-](\d{4})$/;
const INTEGER_PATTERN = /^\d+$/;
const DECIMAL_SEPARATOR = ',';

const invalid: FlowAnswerValidation = { isValid: false };

function accept(answer: string): FlowAnswerValidation {
  return { isValid: true, answer };
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function collectChoiceIds(node: FlowNodeData): readonly string[] {
  const fromOptions = (node.options ?? []).map(([id]) => id);
  const fromBranches = node.next && typeof node.next !== 'string' ? Object.keys(node.next.byAnswer) : [];

  return [...new Set([...fromOptions, ...fromBranches])];
}

/**
 * Aceita o rotulo, o id da opcao ou a posicao na lista.
 *
 * Botao clicado manda o rotulo, para o historico ler como fala de gente; o WhatsApp deixa digitar,
 * e quem digita responde "2" ou "financiamento", nao `opt_financing`.
 */
function validateChoice(node: FlowNodeData, text: string): FlowAnswerValidation {
  const answer = normalize(text);
  const ids = collectChoiceIds(node);

  const byId = ids.find((id) => normalize(id) === answer);
  if (byId) return accept(byId);

  const byLabel = (node.options ?? []).find(([, label]) => normalize(label) === answer);
  if (byLabel) return accept(byLabel[0]);

  const position = Number(answer);
  const isPosition = Number.isInteger(position) && position >= 1 && position <= ids.length;

  return isPosition ? accept(ids[position - 1] as string) : invalid;
}

function validateMoney(text: string): FlowAnswerValidation {
  const digits = text.replace(/[^\d.,]/g, '');
  if (digits.length === 0) return invalid;

  // `1.234,56` e `1234.56` sao a mesma quantia; o separador decimal e o ultimo simbolo que aparece.
  const hasBrazilianDecimal = digits.includes(DECIMAL_SEPARATOR);
  const normalized = hasBrazilianDecimal
    ? digits.replace(/\./g, '').replace(DECIMAL_SEPARATOR, '.')
    : digits.replace(/,/g, '');

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return invalid;

  // String decimal, nunca float: dinheiro atravessa o contexto da sessao e chega ao lead.
  return accept(amount.toFixed(MONEY_DECIMALS));
}

function validateDate(text: string): FlowAnswerValidation {
  const match = DATE_PATTERN.exec(text.trim());
  if (!match) return invalid;

  const [, day, month, year] = match as unknown as [string, string, string, string];
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));

  // `new Date(2026, 1, 31)` vira 3 de marco em silencio; so a volta detecta o dia inexistente.
  const isRealDate = parsed.getFullYear() === Number(year)
    && parsed.getMonth() === Number(month) - 1
    && parsed.getDate() === Number(day);

  return isRealDate ? accept(`${year}-${month}-${day}`) : invalid;
}

function cpfCheckDigit(digits: readonly number[], startWeight: number): number {
  const sum = digits.reduce((total, digit, index) => total + digit * (startWeight - index), 0);
  const remainder = (sum * 10) % CPF_SECOND_DIGIT_WEIGHT;

  return remainder === CPF_FIRST_DIGIT_WEIGHT ? 0 : remainder;
}

function validateCpf(text: string): FlowAnswerValidation {
  const digits = [...text.replace(/\D/g, '')].map(Number);
  if (digits.length !== CPF_LENGTH) return invalid;
  if (digits.every((digit) => digit === digits[0])) return invalid;

  const first = cpfCheckDigit(digits.slice(0, 9), CPF_FIRST_DIGIT_WEIGHT);
  const second = cpfCheckDigit(digits.slice(0, 10), CPF_SECOND_DIGIT_WEIGHT);

  return first === digits[9] && second === digits[10] ? accept(digits.join('')) : invalid;
}

/** No de escolha responde por id, rotulo ou posicao; o resto aceita texto livre. */
export function isChoiceNode(node: FlowNodeData): boolean {
  return node.type === 'menu' || node.questionType === 'choice';
}

export function validateFlowAnswer({ node, text }: ValidateFlowAnswerParams): FlowAnswerValidation {
  if (isChoiceNode(node)) return validateChoice(node, text);

  const trimmed = text.trim();
  if (trimmed.length === 0) return invalid;

  switch (node.questionType) {
    case 'money':
      return validateMoney(trimmed);
    case 'date':
      return validateDate(trimmed);
    case 'int':
      return INTEGER_PATTERN.test(trimmed) ? accept(trimmed) : invalid;
    case 'cpf':
      return validateCpf(trimmed);
    default:
      return accept(trimmed);
  }
}
