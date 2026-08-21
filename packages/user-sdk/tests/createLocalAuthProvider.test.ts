/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { USER_ROLE } from '@/contracts/userRole.constant';
import type { UserSession } from '@/contracts/userSession.types';
import { AUTH_PROVIDER_TYPE } from '@/providers/authProviderType.constant';
import { createLocalAuthProvider } from '@/providers/createLocalAuthProvider';
import type { LocalAuthenticatorInterface } from '@/providers/localAuthenticator.types';

const FAKE_SESSION: UserSession = {
  accessToken: 'token',
  expiresInSeconds: 900,
  agent: { id: 'agent-1', email: 'agent@example.com', name: 'Agente Um', role: USER_ROLE.AGENT },
};

const fakeAuthenticator: LocalAuthenticatorInterface = {
  authenticate: async () => FAKE_SESSION,
};

describe('createLocalAuthProvider', () => {
  it('expoe id e tipo local', () => {
    const provider = createLocalAuthProvider('local', fakeAuthenticator);

    expect(provider.id).toBe('local');
    expect(provider.type).toBe(AUTH_PROVIDER_TYPE.LOCAL);
  });

  it('delega authenticate para o authenticator injetado', async () => {
    const provider = createLocalAuthProvider('local', fakeAuthenticator);

    const session = await provider.authenticate({
      credentials: { email: 'agent@example.com', password: 'senha1234' },
      ipAddress: '127.0.0.1',
    });

    expect(session).toEqual(FAKE_SESSION);
  });
});
