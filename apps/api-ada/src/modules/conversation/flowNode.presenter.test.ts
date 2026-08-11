/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { ChannelAdapterInterface, FlowNodeData } from '@adatechnology/meta-whatsapp-contracts';
import { describe, expect, test } from 'bun:test';

import { presentFlowNode } from '@/modules/conversation/flowNode.presenter';

const TO = '5516999999999';

type SentCall = { readonly kind: string; readonly payload: unknown };

function buildChannel(options: { supportsButtons: boolean }): {
  channel: ChannelAdapterInterface;
  calls: SentCall[];
} {
  const calls: SentCall[] = [];
  const accept = async (kind: string, payload: unknown) => {
    calls.push({ kind, payload });
    return { externalMessageId: null };
  };

  const channel = {
    sendText: (to: string, body: string) => accept('text', { to, body }),
    sendMedia: (params: unknown) => accept('media', params),
    sendTemplate: (params: unknown) => accept('template', params),
    sendInteractiveList: (params: unknown) => accept('list', params),
    fetchMediaAsBase64: async () => ({ data: '', mimeType: 'application/octet-stream' }),
    ...(options.supportsButtons
      ? { sendInteractiveButtons: (params: unknown) => accept('buttons', params) }
      : {}),
  } as unknown as ChannelAdapterInterface;

  return { channel, calls };
}

function buildChoiceNode(options: [string, string][]): FlowNodeData {
  return {
    id: 'no_escolha',
    type: 'menu',
    question: 'Sobre o que você quer saber?',
    options,
  } as FlowNodeData;
}

describe('presentFlowNode', () => {
  test('manda botao quando cabe no teto da Meta', async () => {
    const { channel, calls } = buildChannel({ supportsButtons: true });

    await presentFlowNode({
      node: buildChoiceNode([
        ['falar', '✅ Sim, quero falar'],
        ['voltar', '🔙 Ver outra opção'],
      ]),
      to: TO,
      channel,
    });

    expect(calls).toEqual([
      {
        kind: 'buttons',
        payload: {
          to: TO,
          body: 'Sobre o que você quer saber?',
          buttons: [
            { id: 'falar', title: '✅ Sim, quero falar' },
            { id: 'voltar', title: '🔙 Ver outra opção' },
          ],
        },
      },
    ]);
  });

  test('cai na lista quando passa de tres opcoes', async () => {
    const { channel, calls } = buildChannel({ supportsButtons: true });

    await presentFlowNode({
      node: buildChoiceNode([
        ['a', 'Um'],
        ['b', 'Dois'],
        ['c', 'Tres'],
        ['d', 'Quatro'],
      ]),
      to: TO,
      channel,
    });

    expect(calls[0]?.kind).toBe('list');
  });

  // Botao e capacidade opcional da porta: o canal que nao implementa continua funcionando como
  // antes, com lista — nunca fica sem resposta.
  test('cai na lista quando o canal nao sabe mandar botao', async () => {
    const { channel, calls } = buildChannel({ supportsButtons: false });

    await presentFlowNode({
      node: buildChoiceNode([['falar', 'Sim, quero falar']]),
      to: TO,
      channel,
    });

    expect(calls[0]?.kind).toBe('list');
  });

  test('manda texto puro quando o no nao tem opcao', async () => {
    const { channel, calls } = buildChannel({ supportsButtons: true });

    await presentFlowNode({
      node: { id: 'nome', type: 'question', questionType: 'text', question: 'Como te chamar?' } as FlowNodeData,
      to: TO,
      channel,
    });

    expect(calls).toEqual([{ kind: 'text', payload: { to: TO, body: 'Como te chamar?' } }]);
  });
});
