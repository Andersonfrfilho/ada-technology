/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export const AUTH_PATH = {
  LOGIN: '/v1/auth/login',
  REFRESH: '/v1/auth/refresh',
  LOGOUT: '/v1/auth/logout',
  ME: '/v1/auth/me',
} as const;

export const PANEL_PATH = {
  CONVERSATIONS: '/v1/panel/conversations',
  MARK_ALL_READ: '/v1/panel/conversations/read',
  REALTIME_TICKETS: '/v1/panel/realtime/tickets',
  GLOBAL_EVENTS: '/v1/panel/events',
  DOCUMENTS: '/v1/panel/documents',
  BOT_MESSAGES: '/v1/panel/bot-messages',
  TEMPLATE_SETTINGS: '/v1/panel/template-settings',
  TEMPLATES: '/v1/panel/templates',
  FLOWS: '/v1/panel/flows',
  SIMULATION: '/v1/panel/simulation',
} as const;

export const HTTP_METHOD = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
} as const;

export type HttpMethod = (typeof HTTP_METHOD)[keyof typeof HTTP_METHOD];

export const HTTP_STATUS = {
  NO_CONTENT: 204,
  UNAUTHORIZED: 401,
} as const;

/** Codigo estavel do envelope de erro da API — a mensagem e para gente, o codigo e para codigo. */
export const API_ERROR_CODE = {
  INVALID_CREDENTIALS: 'AGENT_INVALID_CREDENTIALS',
  NOT_AUTHENTICATED: 'AGENT_NOT_AUTHENTICATED',
  NETWORK_UNREACHABLE: 'NETWORK_UNREACHABLE',
} as const;
