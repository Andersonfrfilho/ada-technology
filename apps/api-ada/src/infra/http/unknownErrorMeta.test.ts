/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { buildUnknownErrorMeta } from '@/infra/http/unknownErrorMeta';

const DECOY = 'ISCA-SEGREDO-0123456789';

describe('buildUnknownErrorMeta', () => {
  it('limpa segredos de errorMessage e stack', () => {
    const error = new Error(`connect postgres://admin:${DECOY}@db:5432 falhou; Bearer ${DECOY}; token=${DECOY}`);
    error.stack = `Error: Bearer ${DECOY}\n    at x (password=${DECOY})`;

    const meta = buildUnknownErrorMeta(error);

    expect(JSON.stringify(meta)).not.toContain(DECOY);
    expect(meta.errorName).toBe('Error');
  });

  it('limpa segredos quando o erro nao e uma instancia de Error', () => {
    expect(JSON.stringify(buildUnknownErrorMeta(`Bearer ${DECOY}`))).not.toContain(DECOY);
  });
});
