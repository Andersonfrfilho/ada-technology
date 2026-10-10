/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { DrizzleQueryError } from 'drizzle-orm';

import { handleUncaughtError } from '@/infra/http/exceptionFilter';
import { InfraIntegrationLockedError } from '@/modules/infra/infraIntegration.error';

const DECOY = 'ISCA-TOKEN-0123456789';
const CIPHERTEXT = 'v1.AAAA.BBBB.CCCC-ciphertext';
const TRACE_ID = 'trace-1';
const PATH = '/v1/infra/integration';

let captured: string[] = [];
const originalStderrWrite = process.stderr.write.bind(process.stderr);

beforeEach(() => {
  captured = [];
  process.stderr.write = ((chunk: string | Uint8Array): boolean => {
    captured.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;
});

afterEach(() => {
  process.stderr.write = originalStderrWrite;
});

function buildDriverError(): Error {
  return Object.assign(new Error(`duplicate key value violates unique constraint ${DECOY}`), { code: '23505' });
}

describe('handleUncaughtError com erro do Drizzle', () => {
  it('nao deixa a isca nem o texto cifrado chegarem ao log', () => {
    const error = new DrizzleQueryError(
      'insert into "infra_integrations" ("ciphertext", "token_hint") values ($1, $2)',
      [CIPHERTEXT, DECOY],
      buildDriverError(),
    );
    error.message = `Failed query: insert ... params: ${CIPHERTEXT},${DECOY}`;

    const response = handleUncaughtError({ error, traceId: TRACE_ID, path: PATH });
    const logged = captured.join('');

    expect(response.status).toBe(500);
    expect(logged).not.toContain(DECOY);
    expect(logged).not.toContain(CIPHERTEXT);
    expect(logged).not.toContain('infra_integrations');
    expect(logged).not.toContain('stack');
  });

  it('registra so o nome do erro, o code do driver, a rota e o traceId', () => {
    const error = new DrizzleQueryError('select 1', [DECOY], buildDriverError());

    handleUncaughtError({ error, traceId: TRACE_ID, path: PATH });
    const entry = JSON.parse(captured.join('')) as { traceId: string; meta: Record<string, unknown> };

    expect(entry.traceId).toBe(TRACE_ID);
    expect(entry.meta).toEqual({ path: PATH, errorName: 'DrizzleQueryError', causeCode: '23505' });
  });

  it('trata como erro de banco o erro comum cuja cause traz code de driver', () => {
    const error = new Error(`falha com ${DECOY}`, { cause: buildDriverError() });

    handleUncaughtError({ error, traceId: TRACE_ID, path: PATH });
    const logged = captured.join('');

    expect(logged).not.toContain(DECOY);
    expect(logged).toContain('23505');
  });
});

describe('handleUncaughtError com erro desconhecido comum', () => {
  it('continua logando message e stack', () => {
    const error = new Error('falha comum de teste');

    handleUncaughtError({ error, traceId: TRACE_ID, path: PATH });
    const entry = JSON.parse(captured.join('')) as { meta: Record<string, unknown> };

    expect(entry.meta.errorMessage).toBe('falha comum de teste');
    expect(String(entry.meta.stack)).toContain('falha comum de teste');
  });
});

describe('handleUncaughtError com Retry-After', () => {
  it('erro de dominio com retryAfterSeconds numerico ganha o header Retry-After', () => {
    const response = handleUncaughtError({ error: new InfraIntegrationLockedError(90), traceId: TRACE_ID, path: PATH });

    expect(response.status).toBe(423);
    expect(response.headers.get('Retry-After')).toBe('90');
  });
});
