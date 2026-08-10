/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export type Pagination = {
  readonly total: number;
  readonly page: number;
  readonly perPage: number;
};

export const MAX_PER_PAGE = 100;

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

function baseHeaders(extra?: Record<string, string>): Headers {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
  for (const [key, value] of Object.entries(extra ?? {})) headers.set(key, value);
  return headers;
}

export function jsonData(data: unknown, statusCode = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify({ data }), {
    status: statusCode,
    headers: baseHeaders(extraHeaders),
  });
}

export function jsonList(data: readonly unknown[], pagination: Pagination): Response {
  return new Response(JSON.stringify({ data, pagination }), {
    status: 200,
    headers: baseHeaders(),
  });
}

export function noContent(extraHeaders?: Record<string, string>): Response {
  return new Response(null, { status: 204, headers: baseHeaders(extraHeaders) });
}

export type JsonErrorParams = {
  readonly code: string;
  readonly message: string;
  readonly statusCode: number;
  readonly details?: readonly unknown[];
  readonly extraHeaders?: Record<string, string>;
};

export function jsonError({ code, message, statusCode, details, extraHeaders }: JsonErrorParams): Response {
  const payload = details ? { error: { code, message, details } } : { error: { code, message } };

  return new Response(JSON.stringify(payload), {
    status: statusCode,
    headers: baseHeaders(extraHeaders),
  });
}
