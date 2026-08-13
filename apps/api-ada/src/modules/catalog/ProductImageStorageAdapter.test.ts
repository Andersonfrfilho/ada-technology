/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import type { ObjectStorageProvider, PutObjectInput } from '@adatechnology/object-storage-provider';

import { ProductImageStorageAdapter } from '@/modules/catalog/ProductImageStorageAdapter';

const KEY = 'products/company-1/image.png';
const BYTES = Buffer.from([137, 80, 78, 71]);

function buildAdapter(publicBaseUrl = 'https://cdn.example/ada-products'): {
  adapter: ProductImageStorageAdapter;
  puts: PutObjectInput[];
  deletes: string[];
} {
  const puts: PutObjectInput[] = [];
  const deletes: string[] = [];

  const storage = {
    async put(input: PutObjectInput) {
      puts.push(input);
      return {
        bucket: input.bucket,
        key: input.key,
        provider: 's3' as const,
        contentLength: input.contentLength,
        contentType: input.contentType,
        sha256: input.sha256,
        disposition: 'created' as const,
      };
    },
    async delete(input: { key: string }) {
      deletes.push(input.key);
    },
  } as unknown as ObjectStorageProvider;

  return {
    adapter: new ProductImageStorageAdapter({ storage, bucket: 'ada-products', publicBaseUrl }),
    puts,
    deletes,
  };
}

describe('ProductImageStorageAdapter', () => {
  it('grava no bucket e devolve a URL publica da chave', async () => {
    const { adapter, puts } = buildAdapter();

    const result = await adapter.upload({ buffer: BYTES, mimeType: 'image/png', key: KEY });

    expect(puts[0]?.bucket).toBe('ada-products');
    expect(puts[0]?.contentType).toBe('image/png');
    expect(puts[0]?.contentLength).toBe(BYTES.byteLength);
    // Sobrescrever esconderia colisao de UUID, que seria bug e nao caso de uso.
    expect(puts[0]?.mode).toBe('create-only');
    expect(puts[0]?.sha256).toHaveLength(64);
    expect(result).toEqual({ url: `https://cdn.example/ada-products/${KEY}`, key: KEY });
  });

  it('nao duplica a barra quando a base publica termina com uma', async () => {
    const { adapter } = buildAdapter('https://cdn.example/ada-products/');

    const result = await adapter.upload({ buffer: BYTES, mimeType: 'image/png', key: KEY });

    expect(result.url).toBe(`https://cdn.example/ada-products/${KEY}`);
  });

  it('remove pela chave, no bucket configurado', async () => {
    const { adapter, deletes } = buildAdapter();

    await adapter.delete(KEY);

    expect(deletes).toEqual([KEY]);
  });
});
