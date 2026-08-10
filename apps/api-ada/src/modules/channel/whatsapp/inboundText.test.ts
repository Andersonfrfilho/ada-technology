/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import type { WhatsAppMessage } from '@adatechnology/meta-whatsapp-contracts';

import { extractInboundText } from '@/modules/channel/whatsapp/inboundText';

function buildMessage(overrides: Partial<WhatsAppMessage>): WhatsAppMessage {
  return { id: 'wamid.1', from: '5511999999999', timestamp: '1', type: 'text', ...overrides } as WhatsAppMessage;
}

describe('extractInboundText', () => {
  it('devolve o texto sem espacos das pontas', () => {
    const message = buildMessage({ text: { body: '  quero um orcamento  ' } });

    expect(extractInboundText(message)).toBe('quero um orcamento');
  });

  it('prefere o id da opcao ao rotulo, que viria traduzido pelo aparelho', () => {
    const message = buildMessage({
      type: 'interactive',
      text: { body: 'Produtos' },
      interactive: { type: 'list_reply', list_reply: { id: 'menu_produtos', title: 'Produtos' } },
    });

    expect(extractInboundText(message)).toBe('menu_produtos');
  });

  it('devolve o id do botao escolhido', () => {
    const message = buildMessage({
      type: 'interactive',
      interactive: { type: 'button_reply', button_reply: { id: 'sim', title: 'Sim' } },
    });

    expect(extractInboundText(message)).toBe('sim');
  });

  it('devolve indefinido para midia, que o grafo nao sabe ler', () => {
    expect(extractInboundText(buildMessage({ type: 'audio' }))).toBeUndefined();
  });

  it('devolve indefinido para texto so de espacos', () => {
    expect(extractInboundText(buildMessage({ text: { body: '   ' } }))).toBeUndefined();
  });
});
