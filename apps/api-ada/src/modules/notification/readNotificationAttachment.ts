/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { EMAIL_ATTACHMENT_MAX_BYTES } from '@adatechnology/notification-contracts';

import { NOTIFICATION_ATTACHMENT_FIELD } from '@/modules/notification/notification.constant';
import {
  NotificationAttachmentInvalidError,
  NotificationAttachmentTooLargeError,
} from '@/modules/notification/notificationAttachment.error';
import type { UploadNotificationAttachmentParams } from '@/modules/notification/types/notificationAttachment.types';

/**
 * Le o multipart do anexo.
 *
 * O teto e conferido ANTES de `arrayBuffer()`: depois dele o arquivo ja esta inteiro na memoria do
 * processo, e um teto que so reprova depois de carregar 200MB nao e teto, e um relatorio.
 */
export async function readNotificationAttachment(request: Request): Promise<UploadNotificationAttachmentParams> {
  const form = await request.formData().catch(() => undefined);
  const file = form?.get(NOTIFICATION_ATTACHMENT_FIELD);

  if (!(file instanceof File)) throw new NotificationAttachmentInvalidError('arquivo ausente');
  if (file.size === 0) throw new NotificationAttachmentInvalidError('arquivo vazio');
  if (file.size > EMAIL_ATTACHMENT_MAX_BYTES) throw new NotificationAttachmentTooLargeError(EMAIL_ATTACHMENT_MAX_BYTES);

  return {
    buffer: Buffer.from(await file.arrayBuffer()),
    filename: file.name,
    contentType: file.type,
  };
}
