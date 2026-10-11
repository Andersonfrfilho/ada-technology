/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { buildOriginOverlapWarning } from '@/infra/config/originOverlap';

const PANEL = 'https://painel.ada.test';
const SHARED = 'https://compartilhada.ada.test';

describe('buildOriginOverlapWarning', () => {
  it('em producao lista as origens presentes nas duas listas', () => {
    const warning = buildOriginOverlapWarning({
      env: 'production',
      panelOrigins: [PANEL, SHARED],
      widgetOrigins: [SHARED, 'https://site.test'],
    });

    expect(warning?.origins).toEqual([SHARED]);
    expect(warning?.message.length).toBeGreaterThan(0);
  });

  it('sem sobreposicao nao avisa', () => {
    expect(
      buildOriginOverlapWarning({ env: 'production', panelOrigins: [PANEL], widgetOrigins: [SHARED] }),
    ).toBeUndefined();
  });

  it('fora de producao nao avisa (o dev usa a mesma origem nas duas)', () => {
    expect(
      buildOriginOverlapWarning({ env: 'dev', panelOrigins: [SHARED], widgetOrigins: [SHARED] }),
    ).toBeUndefined();
  });
});
