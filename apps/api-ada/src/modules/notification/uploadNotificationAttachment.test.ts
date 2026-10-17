/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import type { ObjectStorageProvider, PutObjectInput } from '@adatechnology/object-storage-provider';

import { UploadNotificationAttachmentUseCase } from '@/modules/notification/uploadNotificationAttachment.use-case';

const BUCKET = 'ada-notification-attachments';
const PDF = Buffer.from('%PDF-1.4 conteudo');

function buildStorage(overrides: Partial<ObjectStorageProvider> = {}) {
  const puts: PutObjectInput[] = [];

  const storage = {
    put: async (input: PutObjectInput) => {
      puts.push(input);
      return { ...input, provider: 's3' as const, disposition: 'created' as const };
    },
    createSignedDownload: async (input: unknown) => {
      signed.push(input);
      return new URL('https://bucket.exemplo.com/assinada');
    },
    get: async () => new ReadableStream<Uint8Array>(),
    head: async () => undefined,
    delete: async () => undefined,
    health: async () => ({ status: 'up' as const }),
    close: async () => undefined,
    ...overrides,
  } as unknown as ObjectStorageProvider;

  const signed: unknown[] = [];

  return { storage, puts, signed };
}

function buildUseCase(overrides: Partial<ObjectStorageProvider> = {}) {
  const fake = buildStorage(overrides);
  return { ...fake, useCase: new UploadNotificationAttachmentUseCase({ storage: fake.storage, bucket: BUCKET }) };
}

describe('UploadNotificationAttachmentUseCase', () => {
  it('guarda o anexo e devolve a referencia, nunca uma URL', async () => {
    const { useCase } = buildUseCase();

    const reference = await useCase.execute({ buffer: PDF, filename: 'nota.pdf', contentType: 'application/pdf' });

    expect(reference.filename).toBe('nota.pdf');
    expect(reference.byteSize).toBe(PDF.byteLength);
    expect(JSON.stringify(reference)).not.toContain('http');
  });

  /** `security.md` §7: dado pessoal nao pode virar nome de chave. */
  it('a chave e o digest do conteudo, e nao carrega o nome do arquivo', async () => {
    const { useCase } = buildUseCase();

    const reference = await useCase.execute({
      buffer: PDF,
      filename: 'nota-joao-silva.pdf',
      contentType: 'application/pdf',
    });

    expect(reference.key).not.toContain('joao');
    expect(reference.key).toMatch(/^notification-attachments\/[0-9a-f]{64}$/);
  });

  it('o mesmo conteudo com nomes diferentes cai na mesma chave', async () => {
    const { useCase } = buildUseCase();

    const um = await useCase.execute({ buffer: PDF, filename: 'a.pdf', contentType: 'application/pdf' });
    const dois = await useCase.execute({ buffer: PDF, filename: 'b.pdf', contentType: 'application/pdf' });

    expect(um.key).toBe(dois.key);
  });

  it('grava com create-only, para nao sobrescrever objeto existente', async () => {
    const { useCase, puts } = buildUseCase();

    await useCase.execute({ buffer: PDF, filename: 'nota.pdf', contentType: 'application/pdf' });

    expect(puts[0]?.mode).toBe('create-only');
    expect(puts[0]?.bucket).toBe(BUCKET);
  });

  it('recusa tipo fora da lista fechada', async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute({ buffer: PDF, filename: 'x.exe', contentType: 'application/x-msdownload' }),
    ).rejects.toThrow('Tipo de arquivo nao aceito');
  });

  /** O nome vai para o cabecalho MIME e depois para o disco de quem salva. */
  it.each(['../../etc/passwd', 'pasta/nota.pdf', 'pasta' + String.fromCharCode(92) + 'nota.pdf'])(
    'recusa caminho no nome: %j',
    async (filename) => {
      const { useCase } = buildUseCase();

      await expect(useCase.execute({ buffer: PDF, filename, contentType: 'application/pdf' })).rejects.toThrow(
        'nome do arquivo com caminho',
      );
    },
  );

  it('recusa caractere de controle no nome, que injetaria cabecalho MIME', async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute({ buffer: PDF, filename: 'nota' + '\u0000' + '.pdf', contentType: 'application/pdf' }),
    ).rejects.toThrow('caractere de controle');
  });

  it('recusa nome vazio', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute({ buffer: PDF, filename: '   ', contentType: 'application/pdf' })).rejects.toThrow(
      'nome do arquivo vazio',
    );
  });

  /** Falha do bucket vira erro de dominio na fronteira, e nao um erro do SDK subindo cru. */
  it('falha do storage vira erro de dominio', async () => {
    const { useCase } = buildUseCase({
      put: (async () => {
        throw new Error('AccessDenied');
      }) as never,
    });

    await expect(useCase.execute({ buffer: PDF, filename: 'n.pdf', contentType: 'application/pdf' })).rejects.toThrow(
      'Nao foi possivel guardar o anexo',
    );
  });

  it('a URL de download e assinada com disposition de anexo e o nome original', async () => {
    const { useCase, signed } = buildUseCase();

    const reference = await useCase.execute({ buffer: PDF, filename: 'nota.pdf', contentType: 'application/pdf' });
    await useCase.createDownloadUrl(reference);

    expect(signed[0]).toMatchObject({ disposition: 'attachment', filename: 'nota.pdf', bucket: BUCKET });
  });
});
