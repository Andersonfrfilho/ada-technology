/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { productImageBucket } from '@/infra/container';
import { PRODUCT_IMAGE } from '@/modules/catalog/catalog.constant';
import { resolveProductImageKey } from '@/modules/catalog/productImageKey';
import { jsonError } from '@/infra/http/responses';
import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { HTTP_METHOD, type Route } from '@/infra/http/router';
import { ERROR_CODES } from '@/shared/errors/codes';

/**
 * Serve a imagem do produto a partir do bucket.
 *
 * O bucket do Railway e privado e nao ha como torna-lo publico, mas quem busca a imagem e a Meta,
 * para desenhar o item dentro do WhatsApp: a URL precisa ser estavel, sem credencial e sem prazo.
 * URL assinada expira e o catalogo aparece quebrado semanas depois, sem nada ter falhado na hora.
 * Dai o proxy — e por ele a rota e publica, como a imagem que ela serve.
 *
 * A chave nao vem da URL: ela e remontada a partir de dois segmentos validados, e o prefixo e
 * literal. Sem isso o caminho viraria entrada de usuario apontando para qualquer objeto do bucket.
 */

/** O objeto e imutavel: a chave e um UUID novo a cada envio, e trocar a foto gera outra chave. */
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

function buildRoutes(bucket: NonNullable<typeof productImageBucket>): readonly Route[] {
  return [
      {
        method: HTTP_METHOD.GET,
        path: `${PRODUCT_IMAGE.PUBLIC_PATH}/${PRODUCT_IMAGE.KEY_PREFIX}/:companyId/:file`,
        rateLimit: RATE_LIMIT.PRODUCT_IMAGE_READ,
        handler: async ({ params }) => {
          const key = resolveProductImageKey(params);
          if (!key) return imageNotFound();

          const metadata = await bucket.storage.head({ bucket: bucket.name, key });
          if (!metadata) return imageNotFound();

          const body = await bucket.storage.get({ bucket: bucket.name, key });

          return new Response(body, {
            headers: {
              'Content-Type': metadata.contentType,
              'Content-Length': String(metadata.contentLength),
              'Cache-Control': IMMUTABLE_CACHE,
              'X-Content-Type-Options': 'nosniff',
            },
          });
        },
      },
  ];
}

export const productImageRoutes: readonly Route[] = productImageBucket ? buildRoutes(productImageBucket) : [];

function imageNotFound(): Response {
  return jsonError({
    code: ERROR_CODES.catalog.PRODUCT_IMAGE_NOT_FOUND,
    message: 'Imagem nao encontrada',
    statusCode: 404,
  });
}
