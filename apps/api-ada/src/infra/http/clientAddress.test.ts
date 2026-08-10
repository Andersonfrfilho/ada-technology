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
  it('usa o primeiro salto do encaminhamento, que e o cliente', () => {
    const request = buildRequest({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1, 10.0.0.2' });

    expect(resolveClientAddress({ request, socketAddress: '10.0.0.1' })).toBe('203.0.113.7');
  });

  it('cai no endereco do socket sem encaminhamento', () => {
    expect(resolveClientAddress({ request: buildRequest(), socketAddress: '198.51.100.4' })).toBe(
      '198.51.100.4',
    );
  });

  it('ignora encaminhamento vazio em vez de virar balde sem nome', () => {
    const request = buildRequest({ 'x-forwarded-for': '   ' });

    expect(resolveClientAddress({ request, socketAddress: '198.51.100.4' })).toBe('198.51.100.4');
  });

  it('devolve identidade fixa quando nao ha endereco algum', () => {
    expect(resolveClientAddress({ request: buildRequest(), socketAddress: undefined })).toBe('unknown');
  });
});
