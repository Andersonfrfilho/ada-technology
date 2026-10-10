/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { redactLogMeta } from '@/shared/redaction';

const REDACTED = '[REDACTED]';
const DECOY = 'ISCA-SEGREDO-0123456789';

const NEW_SECRET_KEYS: string[] = [
  'credential',
  'credentials',
  'bearer',
  'requestAuthorization',
  'sessionCookie',
  'jwt',
  'accessJwt',
  'apiKey',
  'privateKey',
  'signature',
  'passwd',
  'pwd',
];

describe('redactLogMeta com novos fragmentos de chave', () => {
  it.each(NEW_SECRET_KEYS)('redige %s', (key) => {
    expect(redactLogMeta({ [key]: DECOY })).toEqual({ [key]: REDACTED });
  });

  it('mantem a dica do token legivel', () => {
    expect(redactLogMeta({ tokenHint: '6789' })).toEqual({ tokenHint: '6789' });
  });

  it('mantem legiveis os campos que os logs e a auditoria ja usam', () => {
    const meta = {
      reason: 'rate_limited',
      access: 'ok',
      state: 'configured',
      source: 'panel',
      keyId: 'abc123',
      errorName: 'RailwayRateLimitedError',
      causeCode: '23505',
      actorAgentId: 'agent-1',
      ipAddress: '10.0.0.1',
      action: 'infra.integration.saved',
    };
    expect(redactLogMeta(meta)).toEqual(meta);
  });
});

describe('redactLogMeta em valores string', () => {
  const HOSTILE: ReadonlyArray<readonly [string, string]> = [
    ['Bearer', `falhou com Bearer ${DECOY} no header`],
    ['bearer minusculo', `bearer ${DECOY}`],
    ['usuario:senha@', `postgres://admin:${DECOY}@db.internal:5432/ada`],
    ['token=', `GET /x?token=${DECOY}&page=2`],
    ['password=', `password=${DECOY}`],
    ['secret= maiusculo', `SECRET=${DECOY}`],
    ['jwt', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.ISCA-ASSINATURA-0123456789'],
  ];

  it.each(HOSTILE)('remove o segredo de %s num valor de chave inocua', (_name, text) => {
    const redacted = redactLogMeta({ detail: text });
    expect(JSON.stringify(redacted)).not.toContain('ISCA-');
  });

  it('alcanca valores aninhados e em array', () => {
    const redacted = redactLogMeta({ outer: { list: [`Bearer ${DECOY}`], deep: { text2: `token=${DECOY}` } } });
    expect(JSON.stringify(redacted)).not.toContain(DECOY);
  });

  it('preserva o resto do texto', () => {
    expect(redactLogMeta({ detail: `falhou com Bearer ${DECOY} no header` })).toEqual({
      detail: `falhou com Bearer ${REDACTED} no header`,
    });
  });

  it('nao altera texto sem segredo', () => {
    const meta = { detail: 'Railway respondeu 429 apos 3 tentativas', url: 'https://backboard.railway.com/graphql/v2' };
    expect(redactLogMeta(meta)).toEqual(meta);
  });
});
