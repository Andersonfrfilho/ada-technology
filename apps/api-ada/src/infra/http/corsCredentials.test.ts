/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { buildCorsHeaders } from '@/infra/http/cors';

const PANEL_ONLY = 'https://painel.ada.test';
const WIDGET_ONLY = 'https://site.cliente.test';
const BOTH = 'https://compartilhada.ada.test';

const POLICY = {
  panelOrigins: [PANEL_ONLY, BOTH],
  widgetOrigins: [WIDGET_ONLY, BOTH],
} as const;

describe('buildCorsHeaders — credenciais so para o painel', () => {
  it('origem so do widget recebe o CORS sem Allow-Credentials', () => {
    const headers = buildCorsHeaders({ origin: WIDGET_ONLY, ...POLICY });

    expect(headers.get('access-control-allow-origin')).toBe(WIDGET_ONLY);
    expect(headers.get('access-control-allow-headers')).toContain('X-Widget-Session');
    expect(headers.get('access-control-allow-methods')).toContain('POST');
    expect(headers.has('access-control-allow-credentials')).toBe(false);
  });

  it('origem so do painel recebe credenciais', () => {
    const headers = buildCorsHeaders({ origin: PANEL_ONLY, ...POLICY });

    expect(headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('origem nas duas listas continua recebendo credenciais (configuracao do operador)', () => {
    const headers = buildCorsHeaders({ origin: BOTH, ...POLICY });

    expect(headers.get('access-control-allow-origin')).toBe(BOTH);
    expect(headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('origem desconhecida ou ausente nao recebe nada', () => {
    expect([...buildCorsHeaders({ origin: 'https://x.test', ...POLICY }).keys()]).toEqual([]);
    expect([...buildCorsHeaders({ origin: null, ...POLICY }).keys()]).toEqual([]);
  });
});
