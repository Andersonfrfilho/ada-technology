/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

import { buildOfflineResponse, isRailwayStoppedResponse } from './offlineResponse.js';

// O Worker importa o HTML como texto (regra do wrangler); o teste lê o mesmo arquivo.
const pageHtml = readFileSync(`${import.meta.dir}/index.html`, 'utf8');

const RAILWAY_STOPPED = () =>
  new Response('{"status":"error","code":502}', { status: 502, headers: { 'x-railway-fallback': 'true' } });

describe('isRailwayStoppedResponse', () => {
  it('reconhece o 502 do Railway para serviço parado', () => {
    expect(isRailwayStoppedResponse(RAILWAY_STOPPED())).toBe(true);
  });

  it('deixa passar um 502 da própria aplicação e qualquer outro status', () => {
    expect(isRailwayStoppedResponse(new Response('x', { status: 502 }))).toBe(false);
    expect(isRailwayStoppedResponse(new Response('ok', { status: 200, headers: { 'x-railway-fallback': 'true' } }))).toBe(
      false,
    );
  });
});

describe('buildOfflineResponse', () => {
  it('responde 503 sem cache, com Retry-After e o nome do ambiente', async () => {
    const response = buildOfflineResponse({ pageHtml, environmentName: 'cbni-staging' });
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Retry-After')).toBe('300');
    expect(body).toContain('cbni-staging');
    expect(body).not.toContain('__ENV_NAME__');
  });

  it('escapa o nome do ambiente e usa um padrão quando ele falta', async () => {
    const hostile = await buildOfflineResponse({ pageHtml, environmentName: '<script>x</script>' }).text();
    const fallback = await buildOfflineResponse({ pageHtml, environmentName: undefined }).text();

    expect(hostile).not.toContain('<script>x</script>');
    expect(hostile).toContain('&lt;script&gt;');
    expect(fallback).toContain('Ambiente de homologação');
  });
});

describe('página', () => {
  it('tem a atribuição da Ada Technology com rel noreferrer e sem informação interna', () => {
    expect(pageHtml).toContain('Ada Technology</a> · Todos os direitos reservados');
    expect(pageHtml).toContain('rel="noreferrer"');
    expect(pageHtml).not.toContain('Infra ›');
    expect(pageHtml).not.toContain('painel');
  });
});
