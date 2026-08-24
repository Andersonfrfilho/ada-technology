/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type {
  NotificationCategoryOption,
  NotificationChannelOption,
} from '@adatechnology/notification-ui';

/** Canais oferecidos por este produto — o pacote despacha em cinco e nao opina sobre quais usar. */
export const NOTIFICATION_CHANNELS: readonly NotificationChannelOption[] = [
  { id: 'email', label: 'E-mail' },
];

/** Assuntos disparados por este produto hoje. */
export const NOTIFICATION_CATEGORIES: readonly NotificationCategoryOption[] = [
  { id: 'auth.password_reset', label: 'Redefinicao de senha' },
];
