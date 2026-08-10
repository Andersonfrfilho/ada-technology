/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, test } from 'bun:test';

import { maskPhoneNumber, redactLogMeta } from '@/shared/redaction';

describe('maskPhoneNumber', () => {
  test('mantem apenas os quatro ultimos digitos', () => {
    expect(maskPhoneNumber('5511987654321')).toBe('****4321');
  });

  test('ignora formatacao antes de cortar', () => {
    expect(maskPhoneNumber('+55 (11) 98765-4321')).toBe('****4321');
  });

  test('nao vaza nada quando o valor e curto demais para mascarar', () => {
    expect(maskPhoneNumber('123')).toBe('****');
    expect(maskPhoneNumber('')).toBe('****');
  });
});

describe('redactLogMeta', () => {
  test('apaga headers de autenticacao e assinatura', () => {
    const redacted = redactLogMeta({
      authorization: 'Bearer abc.def.ghi',
      cookie: 'session=1',
      'x-api-key': 'k-123',
      'x-hub-signature-256': 'sha256=deadbeef',
    });

    expect(redacted).toEqual({
      authorization: '[REDACTED]',
      cookie: '[REDACTED]',
      'x-api-key': '[REDACTED]',
      'x-hub-signature-256': '[REDACTED]',
    });
  });

  test('apaga corpo de mensagem de cliente', () => {
    expect(redactLogMeta({ body: 'quero saber o preco', text: 'oi' })).toEqual({
      body: '[REDACTED]',
      text: '[REDACTED]',
    });
  });

  test('mascara telefone em vez de apagar, para manter correlacao', () => {
    expect(redactLogMeta({ from: '5511987654321', whatsappNumber: '5511912345678' })).toEqual({
      from: '****4321',
      whatsappNumber: '****5678',
    });
  });

  test('normaliza a chave antes de decidir', () => {
    // `phone_number`, `phoneNumber` e `PHONE-NUMBER` sao a mesma coisa para quem le o log.
    expect(redactLogMeta({ phone_number: '5511987654321' })).toEqual({ phone_number: '****4321' });
    expect(redactLogMeta({ 'ACCESS-TOKEN': 'x' })).toEqual({ 'ACCESS-TOKEN': '[REDACTED]' });
  });

  test('desce por objeto aninhado e por array', () => {
    expect(
      redactLogMeta({
        request: { headers: { authorization: 'Bearer x' } },
        contacts: [{ email: 'a@b.com' }, { email: 'c@d.com' }],
      }),
    ).toEqual({
      request: { headers: { authorization: '[REDACTED]' } },
      contacts: [{ email: '[REDACTED]' }, { email: '[REDACTED]' }],
    });
  });

  test('preserva identificador opaco, que e a forma correta de rastrear', () => {
    const meta = { conversationId: 'c-1', leadId: 'l-2', messageId: 'm-3', durationMs: 12 };
    expect(redactLogMeta(meta)).toEqual(meta);
  });

  test('corta em profundidade excessiva em vez de percorrer sem limite', () => {
    const deep = { a: { b: { c: { d: { e: { f: { g: { segredo: 'x' } } } } } } } };
    expect(JSON.stringify(redactLogMeta(deep))).toContain('[REDACTED]');
  });
});
