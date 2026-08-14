/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { resolveProductImageKey } from '@/modules/catalog/productImageKey';

const COMPANY_ID = '3f6d0a3c-5c2b-4a1e-9f5c-1d2b3a4c5d6e';
const FILE = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d.webp';

describe('resolveProductImageKey', () => {
  it('monta a chave com o prefixo literal', () => {
    expect(resolveProductImageKey({ companyId: COMPANY_ID, file: FILE })).toBe(
      `products/${COMPANY_ID}/${FILE}`,
    );
  });

  it('recusa empresa que nao e UUID', () => {
    expect(resolveProductImageKey({ companyId: 'outra-empresa', file: FILE })).toBeUndefined();
  });

  it('recusa travessia de caminho no nome do arquivo', () => {
    expect(resolveProductImageKey({ companyId: COMPANY_ID, file: '..%2Fbackup.sql' })).toBeUndefined();
    expect(resolveProductImageKey({ companyId: COMPANY_ID, file: '../../backup.sql' })).toBeUndefined();
  });

  it('recusa arquivo sem extensao', () => {
    expect(resolveProductImageKey({ companyId: COMPANY_ID, file: FILE.split('.')[0]! })).toBeUndefined();
  });

  it('recusa segmento ausente', () => {
    expect(resolveProductImageKey({})).toBeUndefined();
  });
});
