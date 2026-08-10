/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import type { MessageRow } from '@adatechnology/meta-whatsapp-module';

import { toWidgetMessage } from '@/modules/channel/widget/widget.mapper';

const row = {
  id: '2a2c2f14-2b8a-4a3f-9a5e-6f1f5a7f9b10',
  companyId: 'company-1',
  sessionId: 'session-1',
  whatsappNumber: 'w0123456789abcdef',
  direction: 'outbound',
  sender: 'bot',
  agentUserId: 'agent-1',
  type: 'text',
  content: 'Ola',
  payload: { rows: [] },
  waMessageId: 'wamid.1',
  status: 'sent',
  readAt: null,
  createdAt: new Date('2026-08-08T12:00:00.000Z'),
} as unknown as MessageRow;

describe('toWidgetMessage', () => {
  it('nao expoe dado interno para o navegador', () => {
    const message = toWidgetMessage(row);

    expect(Object.keys(message).toSorted()).toEqual([
      'content',
      'createdAt',
      'direction',
      'id',
      'payload',
      'sender',
      'type',
    ]);
  });

  it('entrega a data em ISO, e nao um objeto de banco', () => {
    expect(toWidgetMessage(row).createdAt).toBe('2026-08-08T12:00:00.000Z');
  });
});
