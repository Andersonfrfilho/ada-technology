/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { USER_ROLE } from '@/contracts/userRole.constant';
import { resolveAttributeMapping, type AttributeMapping } from '@/providers/attributeMapping.types';

type GoogleClaims = {
  readonly email: string;
  readonly full_name: string;
};

describe('resolveAttributeMapping', () => {
  const mapping: AttributeMapping<GoogleClaims> = {
    email: { from: 'email' },
    name: { from: 'full_name' },
    role: { value: USER_ROLE.AGENT },
  };

  it('resolve campos a partir das claims do provedor', () => {
    const claims: GoogleClaims = { email: 'agent@example.com', full_name: 'Agente Um' };

    expect(resolveAttributeMapping(claims, mapping)).toEqual({
      email: 'agent@example.com',
      name: 'Agente Um',
      role: USER_ROLE.AGENT,
    });
  });

  it('cai para AGENT quando o valor resolvido nao e um papel conhecido', () => {
    const claimsWithUnknownRole: AttributeMapping<GoogleClaims> = {
      email: { from: 'email' },
      name: { from: 'full_name' },
      role: { value: 'superusuario-inexistente' },
    };

    const claims: GoogleClaims = { email: 'agent@example.com', full_name: 'Agente Um' };

    expect(resolveAttributeMapping(claims, claimsWithUnknownRole).role).toBe(USER_ROLE.AGENT);
  });
});
