/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import {
  createWidgetSessionId,
  isWidgetSessionId,
} from '@/modules/channel/widget/widget.constant';

const WHATSAPP_NUMBER_COLUMN_LENGTH = 20;

describe('createWidgetSessionId', () => {
  it('cabe na coluna que guarda a chave da sessao', () => {
    expect(createWidgetSessionId().length).toBeLessThanOrEqual(WHATSAPP_NUMBER_COLUMN_LENGTH);
  });

  it('nao repete entre visitantes', () => {
    const ids = new Set(Array.from({ length: 100 }, createWidgetSessionId));

    expect(ids.size).toBe(100);
  });

  it('produz id que a propria validacao aceita', () => {
    expect(isWidgetSessionId(createWidgetSessionId())).toBe(true);
  });
});

describe('isWidgetSessionId', () => {
  // Esta e a fronteira que impede alguem de ler a conversa de um cliente pelo numero de telefone.
  it('recusa numero de telefone', () => {
    expect(isWidgetSessionId('5511999999999')).toBe(false);
  });

  it('recusa id com tamanho errado', () => {
    expect(isWidgetSessionId('wabc')).toBe(false);
    expect(isWidgetSessionId(`w${'a'.repeat(17)}`)).toBe(false);
  });

  it('recusa caractere fora do hexadecimal', () => {
    expect(isWidgetSessionId(`w${'z'.repeat(16)}`)).toBe(false);
  });

  it('recusa id sem o prefixo', () => {
    expect(isWidgetSessionId('a'.repeat(17))).toBe(false);
  });
});
