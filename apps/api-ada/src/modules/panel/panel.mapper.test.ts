/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import type { ConversationSummary } from '@adatechnology/meta-whatsapp-contracts';
import type { MessageRow } from '@adatechnology/meta-whatsapp-module';

import { toPanelConversation, toPanelMessage } from '@/modules/panel/panel.mapper';

const WHATSAPP_SUMMARY = {
  id: '9f1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d',
  whatsappNumber: '5511987651234',
  clientName: 'Cliente',
  lastContent: 'Ola',
  lastDirection: 'inbound',
  lastAt: '2026-08-08T12:00:00.000Z',
  lastInboundAt: '2026-08-08T12:00:00.000Z',
  mode: 'bot',
  assignedUserId: null,
  waitingHuman: false,
  unread: 2,
  currentState: 'start',
} as unknown as ConversationSummary;

const MESSAGE_ROW = {
  id: '2a2c2f14-2b8a-4a3f-9a5e-6f1f5a7f9b10',
  companyId: 'company-1',
  sessionId: 'session-1',
  whatsappNumber: '5511987651234',
  direction: 'outbound',
  sender: 'bot',
  type: 'text',
  content: 'Ola',
  payload: null,
  status: 'sent',
  readAt: null,
  moderationFlagged: null,
  moderationTerms: null,
  transcriptionStatus: null,
  createdAt: new Date('2026-08-08T12:00:00.000Z'),
} as unknown as MessageRow;

describe('toPanelConversation', () => {
  it('nao entrega o telefone ao painel', () => {
    const conversation = toPanelConversation(WHATSAPP_SUMMARY);

    expect(conversation.contactHandle).toBe('****1234');
    expect(JSON.stringify(conversation)).not.toContain('5511987651234');
  });

  it('identifica a conversa so pelo id opaco', () => {
    const conversation = toPanelConversation(WHATSAPP_SUMMARY);

    expect(conversation.id).toBe(WHATSAPP_SUMMARY.id);
    expect(conversation.contactId).toBe(WHATSAPP_SUMMARY.id);
  });

  it('rotula o visitante do site em vez de mascarar a chave do widget', () => {
    const summary = {
      ...WHATSAPP_SUMMARY,
      whatsappNumber: 'w0123456789abcdef',
    } as unknown as ConversationSummary;

    const conversation = toPanelConversation(summary);

    expect(conversation.contactHandle).toBe('Visitante do site');
  });

  // `capabilitiesOf` cai no padrao do WhatsApp diante de canal desconhecido: 'widget' daria janela de
  // 24h e composer bloqueado a quem esta falando pelo site.
  it('fala o canal no vocabulario da conversations-ui', () => {
    const widget = { ...WHATSAPP_SUMMARY, whatsappNumber: 'w0123456789abcdef' } as unknown as ConversationSummary;

    expect(toPanelConversation(widget).channel).toBe('webchat');
    expect(toPanelConversation(WHATSAPP_SUMMARY).channel).toBe('whatsapp');
  });
});

describe('toPanelMessage', () => {
  it('nao expoe coluna interna do modulo', () => {
    const message = toPanelMessage(MESSAGE_ROW);

    expect(Object.keys(message).toSorted()).toEqual([
      'content',
      'direction',
      'id',
      'sender',
      'status',
      'timestamp',
      'type',
    ]);
  });

  it('traduz o menu guardado para o formato que a UI desenha', () => {
    const row = {
      ...MESSAGE_ROW,
      type: 'interactive_list',
      payload: { buttonLabel: 'Ver opcoes', rows: [{ id: 'planos', title: 'Planos' }] },
    } as unknown as MessageRow;

    const message = toPanelMessage(row);

    expect(message.type).toBe('interactive');
    expect(message.payload).toEqual({
      type: 'list',
      body: { text: 'Ola' },
      action: { button: 'Ver opcoes', sections: [{ rows: [{ id: 'planos', title: 'Planos' }] }] },
    });
  });

  it('so manda o veredito de moderacao quando ela rodou', () => {
    const row = { ...MESSAGE_ROW, moderationFlagged: false } as unknown as MessageRow;

    expect(toPanelMessage(MESSAGE_ROW).moderation).toBeUndefined();
    expect(toPanelMessage(row).moderation).toEqual({ isOffensive: false, terms: [] });
  });
});
