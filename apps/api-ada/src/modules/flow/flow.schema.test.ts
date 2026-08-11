/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, test } from 'bun:test';

import { DEFAULT_FLOW_GRAPH } from '@/modules/conversation/defaultFlow.constant';
import { parseFlowGraph } from '@/modules/flow/flow.schema';

function buildGraphWithOptions(options: [string, string][]): unknown {
  return {
    key: 'produtos',
    label: 'Produtos',
    startNodeId: 'inicio',
    version: 1,
    nodes: {
      inicio: { id: 'inicio', type: 'menu', question: 'Escolha', options },
    },
  };
}

function buildOptions(total: number, title: string): [string, string][] {
  return Array.from({ length: total }, (_, index) => [`op${index}`, title]);
}

describe('parseFlowGraph', () => {
  // O grafo em codigo e o que semeia a base: se ele mesmo nao passasse na validacao de publicacao,
  // a base nasceria com uma conversa que a Meta recusa.
  test('aceita o grafo padrao que semeia a base', () => {
    expect(() => parseFlowGraph(DEFAULT_FLOW_GRAPH)).not.toThrow();
  });

  test('recusa titulo de botao acima de vinte caracteres', () => {
    const graph = buildGraphWithOptions([
      ['sim', '✅ Sim, quero falar agora mesmo'],
      ['nao', '🔙 Voltar'],
    ]);

    expect(() => parseFlowGraph(graph)).toThrow(/sai como botao/);
  });

  test('aceita na lista o titulo que o botao recusaria', () => {
    const longTitle = '💬 Atendimento WhatsApp';
    const asButtons = buildGraphWithOptions(buildOptions(2, longTitle));
    const asList = buildGraphWithOptions(buildOptions(4, longTitle));

    expect(() => parseFlowGraph(asButtons)).toThrow(/sai como botao/);
    expect(() => parseFlowGraph(asList)).not.toThrow();
  });

  test('recusa titulo de lista acima de vinte e quatro caracteres', () => {
    const graph = buildGraphWithOptions(buildOptions(4, 'Atendimento no WhatsApp oficial'));

    expect(() => parseFlowGraph(graph)).toThrow(/sai como lista/);
  });

  test('recusa mais de dez opcoes num no', () => {
    const graph = buildGraphWithOptions(buildOptions(11, 'Opcao'));

    expect(() => parseFlowGraph(graph)).toThrow(/quebre em dois nos/);
  });
});
