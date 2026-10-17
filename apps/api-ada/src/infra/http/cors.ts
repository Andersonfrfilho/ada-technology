/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { environment } from '@/infra/config/environment';

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization, X-Trace-Id, X-Widget-Session';

export type BuildCorsHeadersParams = {
  readonly origin: string | null;
  readonly panelOrigins: readonly string[];
  readonly widgetOrigins: readonly string[];
};

// Allowlist explicita: origem desconhecida nao recebe cabecalho de CORS, e o navegador barra a
// resposta. Credenciais so para o painel — o widget nao usa cookie, e com credenciais um site de
// terceiros poderia ler a resposta de rotas autenticadas por cookie.
export function buildCorsHeaders({ origin, panelOrigins, widgetOrigins }: BuildCorsHeadersParams): Headers {
  const headers = new Headers();
  const isPanel = origin !== null && panelOrigins.includes(origin);
  const isWidget = origin !== null && widgetOrigins.includes(origin);

  if (!origin || (!isPanel && !isWidget)) return headers;

  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS);
  headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  if (isPanel) headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Max-Age', '600');
  headers.set('Vary', 'Origin');

  return headers;
}

export function resolveCorsHeaders(request: Request): Headers {
  return buildCorsHeaders({
    origin: request.headers.get('origin'),
    panelOrigins: environment.CORS_ALLOWED_ORIGINS,
    widgetOrigins: environment.WIDGET_ALLOWED_ORIGINS,
  });
}

export function isWidgetOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return environment.WIDGET_ALLOWED_ORIGINS.includes(origin);
}

export function isPanelOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return environment.CORS_ALLOWED_ORIGINS.includes(origin);
}
