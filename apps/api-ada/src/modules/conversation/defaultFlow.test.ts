/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { FlowNodeData } from '@adatechnology/meta-whatsapp-contracts';
import { describe, expect, test } from 'bun:test';

import { DEFAULT_FLOW_GRAPH } from '@/modules/conversation/defaultFlow.constant';
import { LEAD_CONTEXT_KEY } from '@/shared/constants/domain.constant';

const NODES = DEFAULT_FLOW_GRAPH.nodes as Readonly<Record<string, FlowNodeData>>;

function targetsOf(node: FlowNodeData): readonly string[] {
  const { next } = node;
  if (!next) return [];
  if (typeof next === 'string') return [next];

  return [...Object.values(next.byAnswer ?? {}), ...(next.default ? [next.default] : [])];
}

function reachableContextKeys(startNodeId: string): readonly string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const queue = [startNodeId];

  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (seen.has(id)) continue;
    seen.add(id);

    const node = NODES[id];
    if (!node || node.type === 'action') continue;
    if (node.contextKey) keys.push(node.contextKey);
    queue.push(...targetsOf(node));
  }

  return keys;
}

describe('DEFAULT_FLOW_GRAPH', () => {
  test('todo destino de `next` existe no grafo', () => {
    const dangling = Object.values(NODES).flatMap((node) =>
      targetsOf(node).filter((target) => !NODES[target]),
    );

    expect(dangling).toEqual([]);
  });

  /**
   * O contato so e pedido depois do aceite.
   *
   * Pedir WhatsApp e e-mail a quem ainda esta lendo o menu custa a conversa: e por isso que os dois
   * nos ficam atras do "sim, quero falar", e nao na abertura ao lado do nome.
   */
  test('pede WhatsApp e e-mail so depois de aceitar falar com o time', () => {
    const contactKeys: readonly string[] = [LEAD_CONTEXT_KEY.PHONE, LEAD_CONTEXT_KEY.EMAIL];

    // Quem chega ao no de contato so chega escolhendo uma opcao — nunca por `next` direto.
    const predecessors = Object.values(NODES).filter((node) =>
      targetsOf(node).some((target) => NODES[target]?.contextKey === LEAD_CONTEXT_KEY.PHONE),
    );

    expect(predecessors.length).toBeGreaterThan(0);
    expect(predecessors.every((node) => typeof node.next === 'object')).toBe(true);

    for (const key of contactKeys) {
      expect(reachableContextKeys(DEFAULT_FLOW_GRAPH.startNodeId)).toContain(key);
    }
  });

  /** Fim de conversa e handoff ou nada: no sem saida deixa o cliente falando sozinho. */
  test('todo caminho termina em handoff', () => {
    const leaves = Object.values(NODES).filter((node) => targetsOf(node).length === 0);

    expect(leaves.every((node) => node.type === 'action')).toBe(true);
  });
});
