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

/**
 * Os cinco canais que o pacote despacha.
 *
 * Aparecem todos no editor de propria: escrever o texto vem antes de o canal existir, e a tela e o
 * lugar de preparar a mensagem. O envio e outra conversa — canal sem driver configurado no
 * `api-ada` nasce `skipped` com `channel_not_configured`, registrado na entrega. Hoje so o e-mail
 * tem driver; o resto e redacao adiantada, nao promessa de entrega.
 */
export const NOTIFICATION_CHANNELS: readonly NotificationChannelOption[] = [
  { id: 'email', label: 'E-mail' },
  { id: 'whatsapp', label: 'WhatsApp', hint: 'Exige template aprovado na Meta' },
  { id: 'sms', label: 'SMS', hint: 'Cobrado por segmento de 160 caracteres' },
  { id: 'push', label: 'Push', hint: 'Exige aparelho registrado' },
  { id: 'inbox', label: 'No painel' },
];

/** Assuntos disparados por este produto hoje. */
export const NOTIFICATION_CATEGORIES: readonly NotificationCategoryOption[] = [
  { id: 'auth.password_reset', label: 'Redefinicao de senha' },
];
