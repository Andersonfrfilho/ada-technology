/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { ConversationSummary } from '@adatechnology/meta-whatsapp-contracts';
import { describe, expect, it } from 'bun:test';

import { toClientNameMap, withClientName } from '@/modules/panel/clientName.resolver';

const summary = {
  id: 'conv-1',
  whatsappNumber: 'widget:sess-1',
  lastAt: '2026-08-21T11:34:00.000Z',
  lastInboundAt: null,
  mode: 'bot',
  assignedUserId: null,
  waitingHuman: false,
  unread: 0,
  currentState: 'start',
} as ConversationSummary;

describe('toClientNameMap', () => {
  it('mapeia a conversa pelo nome gravado no contexto', () => {
    const names = toClientNameMap([{ conversationKey: 'widget:sess-1', name: 'Anderson Fernandes' }]);

    expect(names.get('widget:sess-1')).toBe('Anderson Fernandes');
  });

  it('descarta nome ausente, vazio ou so espacos', () => {
    const names = toClientNameMap([
      { conversationKey: 'a', name: null },
      { conversationKey: 'b', name: '' },
      { conversationKey: 'c', name: '   ' },
    ]);

    expect(names.size).toBe(0);
  });

  it('apara o nome antes de guardar', () => {
    const names = toClientNameMap([{ conversationKey: 'a', name: '  Anderson  ' }]);

    expect(names.get('a')).toBe('Anderson');
  });
});

describe('withClientName', () => {
  it('anexa o nome quando a conversa tem um', () => {
    const names = new Map([['widget:sess-1', 'Anderson Fernandes']]);

    expect(withClientName({ summary, names }).clientName).toBe('Anderson Fernandes');
  });

  it('devolve a conversa intacta quando nao ha nome', () => {
    expect(withClientName({ summary, names: new Map() }).clientName).toBeUndefined();
  });
});
