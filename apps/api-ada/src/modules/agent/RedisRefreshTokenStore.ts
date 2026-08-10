/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { randomBytes } from 'node:crypto';

import { redis } from '@/infra/cache/redisClient';
import { REFRESH_TOKEN_TTL_SECONDS } from '@/modules/agent/agent.constant';
import type {
  IssuedRefreshToken,
  RefreshTokenStoreInterface,
  RotatedRefreshToken,
} from '@/modules/agent/types/agent.types';

const KEY_PREFIX = 'panel:refresh:';
const TOKEN_BYTES = 32;

export class RedisRefreshTokenStore implements RefreshTokenStoreInterface {
  async issue(agentId: string): Promise<IssuedRefreshToken> {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    await redis.set(keyOf(token), agentId, 'EX', REFRESH_TOKEN_TTL_SECONDS);

    return { token, expiresInSeconds: REFRESH_TOKEN_TTL_SECONDS };
  }

  /**
   * `GETDEL` num comando so: ler e apagar em duas idas permitiria que dois pedidos simultaneos com
   * o mesmo token vissem o valor antes da remocao. E dai que vem a garantia de uso unico — um
   * refresh roubado so vale ate o dono usar o dele.
   */
  async rotate(token: string): Promise<RotatedRefreshToken | undefined> {
    const agentId = await redis.getdel(keyOf(token));
    if (!agentId) return undefined;

    const issued = await this.issue(agentId);

    return { ...issued, agentId };
  }

  async revoke(token: string): Promise<void> {
    await redis.del(keyOf(token));
  }
}

function keyOf(token: string): string {
  return `${KEY_PREFIX}${token}`;
}
