/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { localCredentialsSchema } from '@/contracts/localCredentials.schema';

describe('localCredentialsSchema', () => {
  it('aceita email e senha validos, normalizando o email', () => {
    const result = localCredentialsSchema.parse({ email: 'Agent@Example.com', password: 'senha1234' });

    expect(result).toEqual({ email: 'agent@example.com', password: 'senha1234' });
  });

  it('rejeita email invalido', () => {
    expect(() => localCredentialsSchema.parse({ email: 'nao-e-email', password: 'senha1234' })).toThrow();
  });

  it('rejeita senha abaixo do minimo', () => {
    expect(() => localCredentialsSchema.parse({ email: 'agent@example.com', password: '1234567' })).toThrow();
  });

  it('rejeita senha acima do maximo', () => {
    const tooLong = 'a'.repeat(129);

    expect(() => localCredentialsSchema.parse({ email: 'agent@example.com', password: tooLong })).toThrow();
  });
});
