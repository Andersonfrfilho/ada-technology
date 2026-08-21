/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';
import { z } from 'zod';

import { APP_ENVIRONMENT } from '@/modules/shared/config/appEnvironment.constant';
import { appEnvironmentSchema } from '@/modules/shared/config/environment.schema';

describe('appEnvironmentSchema', () => {
  /**
   * O caso que derrubou a producao.
   *
   * `ARG VITE_APP_ENV` sem valor vira `ENV VITE_APP_ENV=`, o Vite inlina `''`, e o `.default()` do
   * Zod nao dispara para string vazia — so para `undefined`. O `parse` lancava no carregamento do
   * modulo e levava junto todo o JS da pagina.
   */
  it('trata string vazia como ausente e cai em producao', () => {
    expect(appEnvironmentSchema.parse('')).toBe(APP_ENVIRONMENT.PRODUCTION);
  });

  it('trata ausencia como producao', () => {
    expect(appEnvironmentSchema.parse(undefined)).toBe(APP_ENVIRONMENT.PRODUCTION);
  });

  it('aceita os ambientes internos', () => {
    expect(appEnvironmentSchema.parse(APP_ENVIRONMENT.STAGING)).toBe(APP_ENVIRONMENT.STAGING);
    expect(appEnvironmentSchema.parse(APP_ENVIRONMENT.DEVELOPMENT)).toBe(APP_ENVIRONMENT.DEVELOPMENT);
  });

  /** Valor escrito errado continua reprovando: o fallback e para ausencia, nao para engano. */
  it('recusa valor fora do vocabulario', () => {
    expect(() => appEnvironmentSchema.parse('prod')).toThrow(z.ZodError);
  });
});
