/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import {
  conversationRealtimeChannel,
  GLOBAL_REALTIME_CHANNEL,
} from '@/modules/shared/realtime.constant';

describe('conversationRealtimeChannel', () => {
  // O nome vem do modulo: se divergir, o painel assina um canal em que ninguem publica.
  it('usa o canal por conversa que o modulo publica', () => {
    expect(conversationRealtimeChannel('w0123456789abcdef')).toBe('conv:w0123456789abcdef');
  });
});

describe('GLOBAL_REALTIME_CHANNEL', () => {
  it('usa o canal global que o modulo publica', () => {
    expect(GLOBAL_REALTIME_CHANNEL).toBe('global');
  });
});
