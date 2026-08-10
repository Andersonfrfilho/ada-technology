/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { FlowNodeData } from '@adatechnology/meta-whatsapp-contracts';
import { describe, expect, test } from 'bun:test';

import { validateFlowAnswer } from '@/modules/conversation/flowAnswer.validator';

const MENU: FlowNodeData = {
  id: 'menu',
  type: 'menu',
  options: [
    ['produtos', 'Conhecer produtos'],
    ['humano', 'Falar com alguem'],
  ],
};

function question(questionType: NonNullable<FlowNodeData['questionType']>): FlowNodeData {
  return { id: 'campo', type: 'question', questionType };
}

function answerOf(node: FlowNodeData, text: string): string | undefined {
  const validation = validateFlowAnswer({ node, text });

  return validation.isValid ? validation.answer : undefined;
}

describe('validateFlowAnswer em no de escolha', () => {
  test('aceita o id, o rotulo por extenso e a posicao na lista', () => {
    expect(answerOf(MENU, 'produtos')).toBe('produtos');
    expect(answerOf(MENU, ' Conhecer Produtos ')).toBe('produtos');
    expect(answerOf(MENU, '2')).toBe('humano');
  });

  test('recusa texto livre em vez de deixar cair no ramo padrao', () => {
    expect(answerOf(MENU, 'quero saber o preco')).toBeUndefined();
    expect(answerOf(MENU, '3')).toBeUndefined();
    expect(answerOf(MENU, '')).toBeUndefined();
  });

  test('conhece as opcoes declaradas so nos ramos do no', () => {
    const branching: FlowNodeData = {
      id: 'menu',
      type: 'menu',
      next: { byAnswer: { sim: 'a', nao: 'b' }, default: 'b' },
    };

    expect(answerOf(branching, 'SIM')).toBe('sim');
    expect(answerOf(branching, 'talvez')).toBeUndefined();
  });
});

describe('validateFlowAnswer por tipo de campo', () => {
  test('normaliza dinheiro para string decimal nos dois formatos', () => {
    expect(answerOf(question('money'), 'R$ 1.234,56')).toBe('1234.56');
    expect(answerOf(question('money'), '1234.5')).toBe('1234.50');
    expect(answerOf(question('money'), 'nao sei')).toBeUndefined();
  });

  test('recusa data que o calendario nao tem', () => {
    expect(answerOf(question('date'), '31/01/2026')).toBe('2026-01-31');
    expect(answerOf(question('date'), '31/02/2026')).toBeUndefined();
    expect(answerOf(question('date'), 'amanha')).toBeUndefined();
  });

  test('valida o digito verificador do CPF', () => {
    expect(answerOf(question('cpf'), '529.982.247-25')).toBe('52998224725');
    expect(answerOf(question('cpf'), '529.982.247-24')).toBeUndefined();
    expect(answerOf(question('cpf'), '111.111.111-11')).toBeUndefined();
  });

  test('inteiro recusa decimal e texto', () => {
    expect(answerOf(question('int'), '12')).toBe('12');
    expect(answerOf(question('int'), '12,5')).toBeUndefined();
  });

  test('texto livre aceita qualquer coisa nao vazia', () => {
    expect(answerOf(question('text'), '  Ada CRM ')).toBe('Ada CRM');
    expect(answerOf(question('text'), '   ')).toBeUndefined();
  });
});
