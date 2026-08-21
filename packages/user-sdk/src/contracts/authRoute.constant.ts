/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export const AUTH_ROUTE = {
  LOGIN: '/v1/auth/login',
  REFRESH: '/v1/auth/refresh',
  LOGOUT: '/v1/auth/logout',
  ME: '/v1/auth/me',
} as const;
