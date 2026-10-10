/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { redactLogMeta } from '@/shared/redaction';

const DECOY = 'ISCA-TOKEN-0123456789';
const REDACTED = '[REDACTED]';

const SECRET_KEYS: string[] = [
  'railwayToken',
  'newToken',
  'workspaceToken',
  'currentPassword',
  'confirmationPassword',
  'ciphertext',
  'encryptionKey',
  'apiSecret',
];

describe('redactLogMeta por fragmento de nome', () => {
  it.each(SECRET_KEYS)('redige %s no topo', (key) => {
    expect(redactLogMeta({ [key]: DECOY })).toEqual({ [key]: REDACTED });
  });

  it.each(SECRET_KEYS)('redige %s aninhada e dentro de array', (key) => {
    const redacted = redactLogMeta({ request: { details: { inner: { [key]: DECOY } } }, items: [{ [key]: DECOY }] });

    expect(JSON.stringify(redacted)).not.toContain(DECOY);
    expect(redacted).toEqual({ request: { details: { inner: { [key]: REDACTED } } }, items: [{ [key]: REDACTED }] });
  });

  it('redige chave secreta aninhada sem passar por chave ja sensivel', () => {
    const redacted = redactLogMeta({ outer: { deep: [{ railwayToken: DECOY }] } });

    expect(redacted).toEqual({ outer: { deep: [{ railwayToken: REDACTED }] } });
  });

  it('normaliza maiusculas, underscore e hifen antes de procurar o fragmento', () => {
    const redacted = redactLogMeta({ RAILWAY_TOKEN: DECOY, 'new-password': DECOY, Encryption_Key: DECOY });

    expect(redacted).toEqual({ RAILWAY_TOKEN: REDACTED, 'new-password': REDACTED, Encryption_Key: REDACTED });
  });

  it('mantem legivel a dica do token, que nao e segredo (4 caracteres finais)', () => {
    expect(redactLogMeta({ tokenHint: 'a1b2', token_hint: 'a1b2' })).toEqual({ tokenHint: 'a1b2', token_hint: 'a1b2' });
  });

  it('mantem legiveis as chaves que ja eram usadas nos logs e na auditoria', () => {
    const meta = {
      operationId: 'op-1',
      environmentId: 'env-1',
      direction: 'off',
      status: 'ok',
      ok: 1,
      failed: 0,
      skipped: 2,
      workspaceId: 'ws-1',
      railwayEnvironmentId: 'r-1',
      retryAfterSeconds: 30,
      statusCode: 500,
      flowKey: 'menu',
    };

    expect(redactLogMeta(meta)).toEqual(meta);
  });

  // A redacao e por NOME de chave: um segredo no valor de uma chave inocua passa em claro.
  it('nao redige a isca quando ela esta no valor de uma chave inocua', () => {
    expect(redactLogMeta({ detail: DECOY })).toEqual({ detail: DECOY });
  });
});
