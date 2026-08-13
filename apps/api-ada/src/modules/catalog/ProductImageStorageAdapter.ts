/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { createHash } from 'node:crypto';

import type { ProductImageStoragePort } from '@adatechnology/catalog-contracts';
import type { ObjectStorageProvider } from '@adatechnology/object-storage-provider';

export type ProductImageStorageAdapterParams = {
  readonly storage: ObjectStorageProvider;
  readonly bucket: string;
  /**
   * A imagem do produto e buscada pela Meta e renderizada dentro do WhatsApp: precisa de URL
   * estavel e publica. URL assinada expira e o item aparece quebrado semanas depois.
   */
  readonly publicBaseUrl: string;
};

export class ProductImageStorageAdapter implements ProductImageStoragePort {
  private readonly publicBaseUrl: string;

  constructor(private readonly params: ProductImageStorageAdapterParams) {
    this.publicBaseUrl = params.publicBaseUrl.replace(/\/+$/, '');
  }

  async upload(params: {
    readonly buffer: Buffer;
    readonly mimeType: string;
    readonly key: string;
  }): Promise<{ readonly url: string; readonly key: string }> {
    const stored = await this.params.storage.put({
      bucket: this.params.bucket,
      key: params.key,
      body: new Uint8Array(params.buffer),
      contentLength: params.buffer.byteLength,
      contentType: params.mimeType,
      sha256: createHash('sha256').update(params.buffer).digest('hex'),
      // A chave ja e um UUID novo a cada envio: colisao aqui e bug, e sobrescrever esconderia.
      mode: 'create-only',
    });

    return { url: `${this.publicBaseUrl}/${stored.key}`, key: stored.key };
  }

  async delete(key: string): Promise<void> {
    await this.params.storage.delete({ bucket: this.params.bucket, key });
  }
}
