/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, test } from 'bun:test';

import { compareVersions, resolveHighestTaggedVersion } from './compareVersions';

describe('compareVersions', () => {
  test('ordena pelo core numerico, nao lexicograficamente', () => {
    expect(compareVersions('0.2.0', '0.10.0')).toBeLessThan(0);
    expect(compareVersions('1.0.0', '0.9.9')).toBeGreaterThan(0);
    expect(compareVersions('0.1.0', '0.1.0')).toBe(0);
  });

  test('estavel vence o proprio prerelease', () => {
    expect(compareVersions('0.2.0', '0.2.0-rc.19')).toBeGreaterThan(0);
    expect(compareVersions('0.2.0-rc.19', '0.2.0')).toBeLessThan(0);
  });

  test('compara identificador numerico de prerelease como numero', () => {
    // O caso que motiva o comparador proprio: rc.9 vs rc.19 sai errado em ordem de string.
    expect(compareVersions('0.2.0-rc.9', '0.2.0-rc.19')).toBeLessThan(0);
    expect(compareVersions('0.1.0-rc.30', '0.1.0-rc.4')).toBeGreaterThan(0);
  });

  test('prerelease mais curto vem antes quando o prefixo empata', () => {
    expect(compareVersions('0.2.0-rc', '0.2.0-rc.1')).toBeLessThan(0);
  });
});

describe('resolveHighestTaggedVersion', () => {
  test('escolhe rc quando o rc esta a frente do latest', () => {
    expect(resolveHighestTaggedVersion({ latest: '0.1.0', rc: '0.2.0-rc.19' })).toBe('0.2.0-rc.19');
  });

  test('escolhe latest quando o latest esta a frente do rc', () => {
    expect(resolveHighestTaggedVersion({ rc: '0.1.0-rc.1', latest: '0.1.0-rc.2' })).toBe('0.1.0-rc.2');
  });

  test('recusa pacote sem dist-tag', () => {
    expect(() => resolveHighestTaggedVersion({})).toThrow();
  });
});
