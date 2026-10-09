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
      RAILWAY_API_TOKEN: 'token-de-teste',
      RAILWAY_ENVIRONMENT_ID: 'env-de-teste',
    });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain('RAILWAY_WORKSPACE_ID');
  });

  test('token sem RAILWAY_ENVIRONMENT_ID falha', () => {
    const result = parseEnvironment({
      RAILWAY_API_TOKEN: 'token-de-teste',
      RAILWAY_WORKSPACE_ID: 'workspace-de-teste',
    });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain('RAILWAY_ENVIRONMENT_ID');
  });

  test('token com workspace e ambiente passa', () => {
    const result = parseEnvironment({
      RAILWAY_API_TOKEN: 'token-de-teste',
      RAILWAY_WORKSPACE_ID: 'workspace-de-teste',
      RAILWAY_ENVIRONMENT_ID: 'env-de-teste',
    });

    expect(result.success).toBe(true);
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
