/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { createHash } from 'node:crypto';

import type { AvatarStoragePort, PutAvatarParams } from '@adatechnology/user-contracts';
import type { ObjectStorageProvider } from '@adatechnology/object-storage-provider';

import { AGENT_AVATAR_KEY_PREFIX, AGENT_AVATAR_SIGNED_URL_SECONDS } from '@/modules/agent/agent.constant';

export type CreateAgentAvatarStorageParams = {
  readonly storage: ObjectStorageProvider;
  readonly bucket: string;
};

/**
 * Implementacao da porta do `user-module` sobre o bucket privado que ja existe.
 *
 * O modulo define o contrato e as regras; o host so diz onde os bytes moram. E o mesmo arranjo do
 * anexo de e-mail (ADR 0002), e a razao de a foto nao ter virado codigo novo em tres lugares.
 */
export function createAgentAvatarStorage(params: CreateAgentAvatarStorageParams): AvatarStoragePort {
  return {
    async put(put: PutAvatarParams): Promise<string> {
      /*
        Digest do conteudo na chave, e o id do usuario no caminho.

        O id sozinho bastaria para achar, mas a chave ficaria estavel entre trocas — e como a URL
        assinada e cacheada pelo navegador, a foto nova continuaria mostrando a antiga ate o cache
        vencer. Com o digest, trocar a foto troca a chave, e a URL nova e outra.
      */
      const sha256 = createHash('sha256').update(put.body).digest('hex');
      const key = `${AGENT_AVATAR_KEY_PREFIX}/${put.userId}/${sha256}`;

      await params.storage.put({
        bucket: params.bucket,
        key,
        body: put.body,
        contentLength: put.body.byteLength,
        contentType: put.contentType,
        sha256,
        // A mesma foto reenviada nao regrava: o digest ja e o mesmo, e o objeto ja esta la.
        mode: 'create-only',
      });

      return key;
    },

    async sign(key: string): Promise<string> {
      const url = await params.storage.createSignedDownload({
        bucket: params.bucket,
        key,
        expiresInSeconds: AGENT_AVATAR_SIGNED_URL_SECONDS,
        // `inline`, e nao `attachment`: esta URL vai num `<img>`, e `attachment` faria o navegador
        // baixar o arquivo em vez de desenhar a foto.
        disposition: 'inline',
      });

      return url.toString();
    },
  };
}
