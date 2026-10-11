/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export const INFRA_PASSWORD_FAILURE_LIMIT = 5;
export const INFRA_PASSWORD_FAILURE_WINDOW_SECONDS = 15 * 60;
export const INFRA_PASSWORD_LOCK_SECONDS = 15 * 60;

export const INFRA_FAILURES_KEY_PREFIX = 'infra:integration:failures:';
export const INFRA_LOCK_KEY_PREFIX = 'infra:integration:lock:';
