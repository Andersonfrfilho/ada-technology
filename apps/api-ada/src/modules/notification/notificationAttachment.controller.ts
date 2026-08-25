/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { notificationAttachmentUpload } from '@/infra/container';
import { jsonData } from '@/infra/http/responses';
import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { AUTH_REQUIREMENT, HTTP_METHOD } from '@/infra/http/router';
import type { Route } from '@/infra/http/router';
import { NOTIFICATION_ATTACHMENT_UPLOAD_PATH } from '@/modules/notification/notification.constant';
import { NotificationAttachmentUnavailableError } from '@/modules/notification/notificationAttachment.error';
import { readNotificationAttachment } from '@/modules/notification/readNotificationAttachment';

const CREATED = 201;

/**
 * Sobe um anexo e devolve a REFERENCIA que o disparo vai usar.
 *
 * Nao devolve URL de propria: a URL de download e assinada no momento do envio, com vida curta,
 * porque ela e credencial de leitura (ADR 0002). O que o painel guarda e a chave.
 *
 * `auth: agent` porque anexar arquivo a uma notificacao e acao de operador, nunca de visitante — e
 * uma rota de upload aberta e disco de graca para quem passar por ali.
 */
const uploadAttachmentRoute: Route = {
  method: HTTP_METHOD.POST,
  path: NOTIFICATION_ATTACHMENT_UPLOAD_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.NOTIFICATION_ATTACHMENT_UPLOAD,
  handler: async ({ request }) => {
    // Capacidade por ausencia: sem bucket configurado a rota responde 503 com codigo estavel, em vez
    // de estourar um erro do SDK que o painel nao sabe interpretar.
    if (!notificationAttachmentUpload) throw new NotificationAttachmentUnavailableError();

    const upload = await readNotificationAttachment(request);
    const reference = await notificationAttachmentUpload.execute(upload);

    return jsonData(reference, CREATED);
  },
};

export const notificationAttachmentRoutes: readonly Route[] = [uploadAttachmentRoute];
