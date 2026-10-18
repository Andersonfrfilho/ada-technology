/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

const RAILWAY_FALLBACK_HEADER = 'x-railway-fallback';
const BAD_GATEWAY = 502;
const SERVICE_UNAVAILABLE = 503;
const DEFAULT_ENVIRONMENT_NAME = 'Ambiente de homologação';
const MAX_ENVIRONMENT_NAME_LENGTH = 60;
const ENVIRONMENT_NAME_MARKER = '__ENV_NAME__';

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Só o 502 que o próprio Railway devolve para serviço parado: um 502 da aplicação passa como veio. */
export function isRailwayStoppedResponse(response) {
  return response.status === BAD_GATEWAY && response.headers.get(RAILWAY_FALLBACK_HEADER) === 'true';
}

export function buildOfflineResponse({ pageHtml, environmentName }) {
  const name = (environmentName || DEFAULT_ENVIRONMENT_NAME).slice(0, MAX_ENVIRONMENT_NAME_LENGTH);

  return new Response(pageHtml.replace(ENVIRONMENT_NAME_MARKER, escapeHtml(name)), {
    status: SERVICE_UNAVAILABLE,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Retry-After': '300',
      'X-Robots-Tag': 'noindex',
    },
  });
}
