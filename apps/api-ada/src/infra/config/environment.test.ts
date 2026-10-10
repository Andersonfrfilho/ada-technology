/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, test } from 'bun:test';

import { environmentSchema } from '@/infra/config/environment';

const RAILWAY_KEYS = [
  'RAILWAY_API_TOKEN',
  'RAILWAY_WORKSPACE_ID',
  'RAILWAY_ENVIRONMENT_ID',
  'RAILWAY_MANAGED_ENVIRONMENT_PATTERN',
  'RAILWAY_DATABASE_WAIT_SECONDS',
  'INFRA_SECRET_ENCRYPTION_KEY',
] as const;

function parseEnvironment(overrides: Readonly<Record<string, string>>) {
  const baseEnvironment: Record<string, string | undefined> = { ...process.env };
  for (const key of RAILWAY_KEYS) delete baseEnvironment[key];

  return environmentSchema.safeParse({ ...baseEnvironment, ...overrides });
}

function issuePaths(result: ReturnType<typeof parseEnvironment>): string[] {
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('environmentSchema (Railway)', () => {
  test('sem token passa com os defaults', () => {
    const result = parseEnvironment({});

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.RAILWAY_API_TOKEN).toBe('');
    expect(result.data.RAILWAY_MANAGED_ENVIRONMENT_PATTERN).toBe('staging');
    expect(result.data.RAILWAY_DATABASE_WAIT_SECONDS).toBe(120);
  });

  test('token sem workspace falha', () => {
    const result = parseEnvironment({
      ENV: 'production',
      RAILWAY_API_TOKEN: 'token-de-teste',
      RAILWAY_ENVIRONMENT_ID: 'env-de-teste',
    });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain('RAILWAY_WORKSPACE_ID');
  });

  test('token sem RAILWAY_ENVIRONMENT_ID falha', () => {
    const result = parseEnvironment({
      ENV: 'production',
      RAILWAY_API_TOKEN: 'token-de-teste',
      RAILWAY_WORKSPACE_ID: 'workspace-de-teste',
    });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain('RAILWAY_ENVIRONMENT_ID');
  });

  test('production com token, workspace e ambiente passa', () => {
    const result = parseEnvironment({
      ENV: 'production',
      RAILWAY_API_TOKEN: 'token-de-teste',
      RAILWAY_WORKSPACE_ID: 'workspace-de-teste',
      RAILWAY_ENVIRONMENT_ID: 'env-de-teste',
    });

    expect(result.success).toBe(true);
  });

  test('token fora de ENV=production falha em staging, dev e test', () => {
    for (const environment of ['staging', 'dev', 'test']) {
      const result = parseEnvironment({
        ENV: environment,
        RAILWAY_API_TOKEN: 'token-de-teste',
        RAILWAY_WORKSPACE_ID: 'workspace-de-teste',
        RAILWAY_ENVIRONMENT_ID: 'env-de-teste',
      });

      expect(result.success).toBe(false);
      expect(issuePaths(result)).toContain('RAILWAY_API_TOKEN');
    }
  });

  test('sem token passa em qualquer ENV', () => {
    for (const environment of ['staging', 'dev', 'test', 'production']) {
      expect(parseEnvironment({ ENV: environment }).success).toBe(true);
    }
  });

  test('regex invalida falha', () => {
    const result = parseEnvironment({ RAILWAY_MANAGED_ENVIRONMENT_PATTERN: '(' });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain('RAILWAY_MANAGED_ENVIRONMENT_PATTERN');
  });

  test.each(['9', '601'])('wait seconds %s fora de 10..600 falha', (value) => {
    const result = parseEnvironment({ RAILWAY_DATABASE_WAIT_SECONDS: value });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain('RAILWAY_DATABASE_WAIT_SECONDS');
  });
});

const TEST_KEY_BYTES = Buffer.from(Array.from({ length: 32 }, (_, index) => index * 7 + 11));
const TEST_KEY = TEST_KEY_BYTES.toString('base64');
const TEST_KEY_HEX = TEST_KEY_BYTES.toString('hex');
const VALID_KEY_SETUP = {
  ENV: 'production',
  INFRA_SECRET_ENCRYPTION_KEY: TEST_KEY,
  RAILWAY_WORKSPACE_ID: 'workspace-de-teste',
  RAILWAY_ENVIRONMENT_ID: 'env-de-teste',
} as const;

function errorText(result: ReturnType<typeof parseEnvironment>): string {
  return result.success ? '' : JSON.stringify(result.error.issues) + result.error.message;
}

function expectRejectedWithoutLeak(overrides: Readonly<Record<string, string>>, path: string): void {
  const result = parseEnvironment({ ...VALID_KEY_SETUP, ...overrides });

  expect(result.success).toBe(false);
  expect(issuePaths(result)).toContain(path);
  expect(errorText(result)).not.toContain(overrides.INFRA_SECRET_ENCRYPTION_KEY ?? TEST_KEY);
  expect(errorText(result)).not.toContain(TEST_KEY_HEX);
}

describe('environmentSchema (chave de cifra da infra)', () => {
  test('chave valida em production com workspace e ambiente passa', () => {
    expect(parseEnvironment(VALID_KEY_SETUP).success).toBe(true);
  });

  test('sem chave passa em qualquer ENV e o default e vazio', () => {
    for (const environment of ['staging', 'dev', 'test', 'production']) {
      const result = parseEnvironment({ ENV: environment });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.INFRA_SECRET_ENCRYPTION_KEY).toBe('');
    }
  });

  test('chave de 32 bytes todos iguais falha sem vazar o valor', () => {
    const key = Buffer.alloc(32, 9).toString('base64');
    expectRejectedWithoutLeak({ INFRA_SECRET_ENCRYPTION_KEY: key }, 'INFRA_SECRET_ENCRYPTION_KEY');
  });

  test('chave de 32 bytes com menos de 16 distintos falha sem vazar o valor', () => {
    const key = Buffer.from(Array.from({ length: 32 }, (_, index) => index % 8)).toString('base64');
    expectRejectedWithoutLeak({ INFRA_SECRET_ENCRYPTION_KEY: key }, 'INFRA_SECRET_ENCRYPTION_KEY');
  });

  test.each([31, 33])('chave de %i bytes falha sem vazar o valor', (size) => {
    const key = Buffer.alloc(size, 9).toString('base64');
    expectRejectedWithoutLeak({ INFRA_SECRET_ENCRYPTION_KEY: key }, 'INFRA_SECRET_ENCRYPTION_KEY');
  });

  test('base64 invalido falha sem vazar o valor', () => {
    expectRejectedWithoutLeak({ INFRA_SECRET_ENCRYPTION_KEY: 'isto nao e base64!!' }, 'INFRA_SECRET_ENCRYPTION_KEY');
  });

  test('chave fora de ENV=production falha em staging, dev e test', () => {
    for (const environment of ['staging', 'dev', 'test']) {
      expectRejectedWithoutLeak({ ENV: environment }, 'INFRA_SECRET_ENCRYPTION_KEY');
    }
  });

  test('chave igual ao PANEL_JWT_SECRET falha sem vazar o valor', () => {
    expectRejectedWithoutLeak({ PANEL_JWT_SECRET: TEST_KEY }, 'INFRA_SECRET_ENCRYPTION_KEY');
  });

  test('chave sem RAILWAY_WORKSPACE_ID falha', () => {
    expectRejectedWithoutLeak({ RAILWAY_WORKSPACE_ID: '' }, 'RAILWAY_WORKSPACE_ID');
  });

  test('chave sem RAILWAY_ENVIRONMENT_ID falha', () => {
    expectRejectedWithoutLeak({ RAILWAY_ENVIRONMENT_ID: '' }, 'RAILWAY_ENVIRONMENT_ID');
  });

  test('chave presente nao afeta as regras do RAILWAY_API_TOKEN', () => {
    const accepted = parseEnvironment({ ...VALID_KEY_SETUP, RAILWAY_API_TOKEN: 'token-de-teste' });
    expect(accepted.success).toBe(true);

    const rejected = parseEnvironment({ ...VALID_KEY_SETUP, ENV: 'staging', RAILWAY_API_TOKEN: 'token-de-teste' });
    expect(issuePaths(rejected)).toContain('RAILWAY_API_TOKEN');
  });
});
