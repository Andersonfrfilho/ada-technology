/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { EmailAttachment } from '@adatechnology/notification-contracts';

import { NotificationAttachmentUnavailableError } from '@/modules/notification/notificationAttachment.error';
import type { NotificationAttachmentRef } from '@/modules/notification/types/notificationAttachment.types';

/**
 * O minimo que assinar exige. Recebido por parametro, e nao importado do container: importar o
 * container sobe servidor, cron e fila — e um teste desta funcao nao pode custar isso.
 */
export type AttachmentSigner = {
  createDownloadUrl(reference: NotificationAttachmentRef): Promise<URL>;
};

export type SignNotificationAttachmentsParams = {
  readonly references: readonly NotificationAttachmentRef[];
  /** Ausente e o bucket nao configurado — capacidade por ausencia, como o `EMAIL_DRIVER`. */
  readonly signer: AttachmentSigner | undefined;
};

/**
 * Transforma a referencia guardada no anexo que o disparo carrega.
 *
 * A assinatura acontece AQUI, no disparo, e nao no upload: ela vale cinco minutos e e credencial de
 * leitura. Assinar no upload significaria guardar credencial com prazo dentro do payload — e ela
 * venceria antes do primeiro reenvio, transformando uma reentrega em e-mail sem anexo.
 *
 * O valor devolvido entra no payload sob o nome da variavel declarada com `kind: 'attachment'`. E o
 * catalogo que faz o `notification-module` reconhecer aquele valor como anexo; sem a declaracao, ele
 * seria so mais um objeto no payload e nenhum arquivo sairia.
 */
export async function signNotificationAttachments(
  params: SignNotificationAttachmentsParams,
): Promise<readonly EmailAttachment[]> {
  if (params.references.length === 0) return [];

  // Seguir em silencio produziria um disparo que promete anexo e entrega e-mail vazio.
  if (!params.signer) throw new NotificationAttachmentUnavailableError();

  const signer = params.signer;

  // Em paralelo: sao assinaturas independentes, e em serie o disparo esperaria a soma delas.
  return Promise.all(
    params.references.map(async (reference) => {
      const url = await signer.createDownloadUrl(reference);

      return { filename: reference.filename, url: url.toString(), contentType: reference.contentType };
    }),
  );
}
