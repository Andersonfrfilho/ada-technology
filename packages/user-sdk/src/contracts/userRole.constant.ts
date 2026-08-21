/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export const USER_ROLE = {
  ADMIN: 'admin',
  AGENT: 'agent',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];
