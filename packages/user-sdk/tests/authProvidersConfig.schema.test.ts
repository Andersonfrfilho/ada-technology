/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import {
  authProvidersConfigSchema,
  buildLocalOnlyAuthProvidersConfig,
} from '@/config/authProvidersConfig.schema';
import { AUTH_PROVIDER_TYPE } from '@/providers/authProviderType.constant';

describe('authProvidersConfigSchema', () => {
  it('aceita o provedor local sozinho', () => {
    expect(buildLocalOnlyAuthProvidersConfig()).toEqual([
      { id: 'local', type: AUTH_PROVIDER_TYPE.LOCAL, enabled: true },
    ]);
  });

  it('exige os campos do OAuth2 quando o tipo e oauth2', () => {
    expect(() =>
      authProvidersConfigSchema.parse([
        { id: 'google', type: AUTH_PROVIDER_TYPE.OAUTH2, enabled: true },
      ]),
    ).toThrow();
  });

  it('aceita OAuth2 configurado com todos os campos', () => {
    const parsed = authProvidersConfigSchema.parse([
      {
        id: 'google',
        type: AUTH_PROVIDER_TYPE.OAUTH2,
        enabled: true,
        clientId: 'client-id',
        clientSecret: 'client-secret',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
      },
    ]);

    expect(parsed).toHaveLength(1);
  });

  it('rejeita dois provedores habilitados com o mesmo id', () => {
    expect(() =>
      authProvidersConfigSchema.parse([
        { id: 'local', type: AUTH_PROVIDER_TYPE.LOCAL, enabled: true },
        { id: 'local', type: AUTH_PROVIDER_TYPE.LOCAL, enabled: true },
      ]),
    ).toThrow();
  });

  it('permite id repetido quando um dos dois esta desabilitado', () => {
    const parsed = authProvidersConfigSchema.parse([
      { id: 'local', type: AUTH_PROVIDER_TYPE.LOCAL, enabled: true },
      { id: 'local', type: AUTH_PROVIDER_TYPE.LOCAL, enabled: false },
    ]);

    expect(parsed).toHaveLength(2);
  });
});
