/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { checkEmailAttachment } from '@adatechnology/notification-contracts';

import { signNotificationAttachments } from '@/modules/notification/signNotificationAttachments';
import type { NotificationAttachmentRef } from '@/modules/notification/types/notificationAttachment.types';

const REF: NotificationAttachmentRef = {
  key: 'notification-attachments/abc123',
  filename: 'nota.pdf',
  contentType: 'application/pdf',
  byteSize: 33,
};

const signer = {
  createDownloadUrl: async (reference: NotificationAttachmentRef) =>
    new URL(`https://storage.exemplo.com/${reference.key}?assinatura=x`),
};

describe('signNotificationAttachments', () => {
  it('sem referencia, nao chama o assinador', async () => {
    const explode = {
      createDownloadUrl: async () => {
        throw new Error('nao deveria assinar');
      },
    };

    expect(await signNotificationAttachments({ references: [], signer: explode })).toEqual([]);
  });

  it('devolve o anexo que o contrato aceita', async () => {
    const [attachment] = await signNotificationAttachments({ references: [REF], signer });

    expect(attachment).toEqual({
      filename: 'nota.pdf',
      url: 'https://storage.exemplo.com/notification-attachments/abc123?assinatura=x',
      contentType: 'application/pdf',
    });
    expect(attachment && checkEmailAttachment(attachment)).toBeUndefined();
  });

  /** Seguir em silencio produziria um disparo que promete anexo e entrega e-mail vazio. */
  it('sem bucket configurado, recusa em vez de mandar e-mail sem anexo', async () => {
    await expect(signNotificationAttachments({ references: [REF], signer: undefined })).rejects.toThrow(
      'Anexo indisponivel',
    );
  });

  it('assina em paralelo, e nao em serie', async () => {
    let simultaneos = 0;
    let pico = 0;

    const lento = {
      createDownloadUrl: async (reference: NotificationAttachmentRef) => {
        simultaneos += 1;
        pico = Math.max(pico, simultaneos);
        await new Promise((resolve) => setTimeout(resolve, 5));
        simultaneos -= 1;
        return new URL(`https://storage.exemplo.com/${reference.key}`);
      },
    };

    await signNotificationAttachments({ references: [REF, { ...REF, key: 'x/2' }, { ...REF, key: 'x/3' }], signer: lento });

    expect(pico).toBe(3);
  });

  it('preserva a ordem das referencias', async () => {
    const segunda: NotificationAttachmentRef = { ...REF, key: 'x/2', filename: 'boleto.pdf' };

    const attachments = await signNotificationAttachments({ references: [REF, segunda], signer });

    expect(attachments.map((attachment) => attachment.filename)).toEqual(['nota.pdf', 'boleto.pdf']);
  });
});
