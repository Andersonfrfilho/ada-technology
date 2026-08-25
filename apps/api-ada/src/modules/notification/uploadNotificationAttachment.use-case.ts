/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { createHash } from 'node:crypto';

import type { ObjectStorageProvider } from '@adatechnology/object-storage-provider';

import {
  NOTIFICATION_ATTACHMENT_CONTENT_TYPES,
  NOTIFICATION_ATTACHMENT_KEY_PREFIX,
  NOTIFICATION_ATTACHMENT_SIGNED_URL_SECONDS,
} from '@/modules/notification/notification.constant';
import {
  NotificationAttachmentInvalidError,
  NotificationAttachmentStoreFailedError,
  NotificationAttachmentTypeNotAllowedError,
} from '@/modules/notification/notificationAttachment.error';
import type {
  NotificationAttachmentRef,
  UploadNotificationAttachmentParams,
} from '@/modules/notification/types/notificationAttachment.types';

type UploadNotificationAttachmentDependencies = {
  readonly storage: ObjectStorageProvider;
  readonly bucket: string;
};

/**
 * Guarda o anexo e devolve a REFERENCIA.
 *
 * Nunca devolve URL: o download e assinado no momento do envio, com vida curta, porque a URL
 * assinada e credencial de leitura. Uma delas guardada num template venceria antes do primeiro
 * reenvio.
 */
export class UploadNotificationAttachmentUseCase {
  constructor(private readonly dependencies: UploadNotificationAttachmentDependencies) {}

  async execute(params: UploadNotificationAttachmentParams): Promise<NotificationAttachmentRef> {
    const filename = assertSafeFilename(params.filename);

    if (!NOTIFICATION_ATTACHMENT_CONTENT_TYPES.includes(params.contentType)) {
      throw new NotificationAttachmentTypeNotAllowedError(params.contentType || 'desconhecido');
    }

    /**
     * A chave e o digest do CONTEUDO, e nao o nome nem um uuid.
     *
     * Tres coisas de uma vez: nao carrega dado pessoal (`security.md` §7 — "nota-joao-silva.pdf" nao
     * pode ser chave), o mesmo arquivo enviado duas vezes ocupa espaco uma so, e o `create-only` do
     * provider responde `replayed` em vez de gravar por cima.
     */
    const sha256 = createHash('sha256').update(params.buffer).digest('hex');
    const key = `${NOTIFICATION_ATTACHMENT_KEY_PREFIX}/${sha256}`;

    // Catch local com motivo (code-standart §7): a falha do bucket vira erro de dominio aqui, na
    // fronteira do adapter, em vez de subir um erro do SDK da AWS para o filtro global.
    try {
      await this.dependencies.storage.put({
        bucket: this.dependencies.bucket,
        key,
        body: params.buffer,
        contentLength: params.buffer.byteLength,
        contentType: params.contentType,
        sha256,
        mode: 'create-only',
      });
    } catch {
      throw new NotificationAttachmentStoreFailedError();
    }

    return { key, filename, contentType: params.contentType, byteSize: params.buffer.byteLength };
  }

  /**
   * A URL que o DRIVER usa para baixar, assinada na hora do envio.
   *
   * `disposition: 'attachment'` e o nome original entram na assinatura: depois de assinada, o
   * cliente nao troca nenhum dos dois.
   */
  async createDownloadUrl(reference: NotificationAttachmentRef): Promise<URL> {
    return this.dependencies.storage.createSignedDownload({
      bucket: this.dependencies.bucket,
      key: reference.key,
      expiresInSeconds: NOTIFICATION_ATTACHMENT_SIGNED_URL_SECONDS,
      disposition: 'attachment',
      filename: reference.filename,
    });
  }
}

/**
 * O nome vai para o cabecalho MIME e, do outro lado, para o disco de quem salva.
 *
 * Recusa em vez de "limpar": um nome sanitizado em silencio chega diferente do que o operador
 * enviou, e ele so descobre quando o cliente pergunta que arquivo e esse.
 */
function assertSafeFilename(filename: string): string {
  const trimmed = filename.trim();

  if (!trimmed) throw new NotificationAttachmentInvalidError('nome do arquivo vazio');
  if (/[/\\]|\.\./.test(trimmed)) throw new NotificationAttachmentInvalidError('nome do arquivo com caminho');

  // Controle e quebra de linha injetariam um cabecalho MIME novo a partir do nome do arquivo.
  if (/[\u0000-\u001f]/.test(trimmed)) {
    throw new NotificationAttachmentInvalidError('nome do arquivo com caractere de controle');
  }

  return trimmed;
}
