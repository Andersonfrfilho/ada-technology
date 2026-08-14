/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { PRODUCT_IMAGE } from '@/modules/catalog/catalog.constant';

/**
 * A chave do objeto nao vem da URL: ela e remontada a partir de dois segmentos validados, com o
 * prefixo literal. Sem isso o caminho viraria entrada de usuario apontando para qualquer objeto do
 * bucket — o mesmo bucket onde vivem as fotos de todas as empresas.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{3,4}$/i;

export function resolveProductImageKey(params: Readonly<Record<string, string>>): string | undefined {
  const companyId = params.companyId ?? '';
  const file = params.file ?? '';
  if (!UUID_PATTERN.test(companyId) || !FILE_PATTERN.test(file)) return undefined;

  return `${PRODUCT_IMAGE.KEY_PREFIX}/${companyId}/${file}`;
}
