/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { environment } from '@/infra/config/environment';

const ALLOWED_ORIGINS = new Set([
  ...environment.CORS_ALLOWED_ORIGINS,
  ...environment.WIDGET_ALLOWED_ORIGINS,
]);

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization, X-Trace-Id, X-Widget-Session';

// Allowlist explicita: origem desconhecida nao recebe cabecalho de CORS,
// e o navegador barra a resposta.
export function resolveCorsHeaders(request: Request): Headers {
  const headers = new Headers();
  const origin = request.headers.get('origin');

  if (!origin || !ALLOWED_ORIGINS.has(origin)) return headers;

  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS);
  headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Max-Age', '600');
  headers.set('Vary', 'Origin');

  return headers;
}

export function isWidgetOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return environment.WIDGET_ALLOWED_ORIGINS.includes(origin);
}
