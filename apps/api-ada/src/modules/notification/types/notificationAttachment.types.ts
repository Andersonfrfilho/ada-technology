/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export type UploadNotificationAttachmentParams = {
  readonly buffer: Buffer;
  /** Nome que o destinatario vera. Nunca vira parte da chave do objeto. */
  readonly filename: string;
  readonly contentType: string;
};

/**
 * O que a rota devolve, e o que o disparo guarda.
 *
 * `key` e nao URL: a URL de download e assinada no momento do envio, com vida curta. Guardar uma URL
 * assinada num template ou num job seria guardar credencial com prazo — e ela venceria antes do
 * primeiro reenvio.
 */
export type NotificationAttachmentRef = {
  readonly key: string;
  readonly filename: string;
  readonly contentType: string;
  readonly byteSize: number;
};
