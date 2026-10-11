/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { resolveClientAddress } from '@/infra/http/clientAddress';

const URL_UNDER_TEST = 'https://api.ada.test/v1/widget/sessions';

function buildRequest(headers: Record<string, string> = {}): Request {
  return new Request(URL_UNDER_TEST, { headers });
}

describe('resolveClientAddress', () => {
  it('usa o X-Real-IP, que o proxy da Railway preenche com o cliente remoto', () => {
    const request = buildRequest({ 'x-real-ip': '203.0.113.7' });

    expect(resolveClientAddress({ request, socketAddress: '10.0.0.1' })).toBe('203.0.113.7');
  });

  it('aceita IPv6 no X-Real-IP', () => {
    const request = buildRequest({ 'x-real-ip': '2001:db8::1' });

    expect(resolveClientAddress({ request, socketAddress: '10.0.0.1' })).toBe('2001:db8::1');
  });

  it('nao confia no X-Forwarded-For, que o cliente forja', () => {
    const request = buildRequest({ 'x-forwarded-for': '1.2.3.4', 'x-real-ip': '203.0.113.7' });

    expect(resolveClientAddress({ request, socketAddress: '10.0.0.1' })).toBe('203.0.113.7');
  });

  it('um X-Forwarded-For forjado nao muda o endereco do socket', () => {
    const request = buildRequest({ 'x-forwarded-for': '1.2.3.4' });

    expect(resolveClientAddress({ request, socketAddress: '198.51.100.4' })).toBe('198.51.100.4');
  });

  it('cai no endereco do socket sem X-Real-IP', () => {
    expect(resolveClientAddress({ request: buildRequest(), socketAddress: '198.51.100.4' })).toBe(
      '198.51.100.4',
    );
  });

  it('ignora X-Real-IP que nao e um IP', () => {
    const request = buildRequest({ 'x-real-ip': 'nao-e-um-ip' });

    expect(resolveClientAddress({ request, socketAddress: '198.51.100.4' })).toBe('198.51.100.4');
  });

  it('ignora X-Real-IP vazio', () => {
    const request = buildRequest({ 'x-real-ip': '   ' });

    expect(resolveClientAddress({ request, socketAddress: '198.51.100.4' })).toBe('198.51.100.4');
  });

  it('devolve identidade fixa quando nao ha endereco algum', () => {
    expect(resolveClientAddress({ request: buildRequest(), socketAddress: undefined })).toBe('unknown');
  });
});
