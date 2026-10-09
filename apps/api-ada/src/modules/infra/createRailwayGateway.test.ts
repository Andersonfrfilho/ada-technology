/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { createRailwayGateway } from '@/modules/infra/createRailwayGateway';
import { RailwayGateway } from '@/modules/infra/RailwayGateway';

describe('createRailwayGateway', () => {
  it('returns undefined when the token is empty so the Infra module stays off', () => {
    expect(createRailwayGateway({ token: '', workspaceId: '' })).toBeUndefined();
  });

  it('returns a gateway when a token is configured', () => {
    expect(createRailwayGateway({ token: 'test-token', workspaceId: 'workspace-1' })).toBeInstanceOf(RailwayGateway);
  });
});
