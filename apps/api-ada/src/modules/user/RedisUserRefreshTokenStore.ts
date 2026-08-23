/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { createHash, randomBytes } from 'node:crypto';

import { redis } from '@/infra/cache/redisClient';
import type { RefreshTokenStorePort } from '@adatechnology/user-contracts';

const KEY_PREFIX = 'panel:user-refresh:';
const USER_INDEX_PREFIX = 'panel:user-refresh:index:';
const TOKEN_BYTES = 32;

/**
 * `RefreshTokenStorePort` sobre o mesmo Redis do `RedisRefreshTokenStore` do `agents`, mas com
 * prefixo proprio: durante a Fase A os dois sistemas de auth rodam em paralelo e nao devem
 * enxergar as sessoes um do outro.
 *
 * Nao da para reusar o store antigo direto — os contratos divergem em parametro, retorno e, o que
 * decide, na chave: o `user-module` entrega o **sha256** do token, e o store antigo indexa pelo
 * token cru. Guardar pelo hash tambem e um ganho de seguranca: um dump do Redis deixa de valer
 * sessao.
 */
export class RedisUserRefreshTokenStore implements RefreshTokenStorePort {
  async issue(params: { userId: string; expiresInSeconds: number }): Promise<string> {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const tokenHash = hashOf(token);

    // Sem o indice por usuario nao ha como derrubar todas as sessoes numa troca de senha — o
    // Redis nao permite varrer por valor sem `SCAN` na base inteira.
    await redis
      .multi()
      .set(keyOf(tokenHash), params.userId, 'EX', params.expiresInSeconds)
      .sadd(indexOf(params.userId), tokenHash)
      .expire(indexOf(params.userId), params.expiresInSeconds)
      .exec();

    return token;
  }

  /**
   * `GETDEL` num comando so: ler e apagar em duas idas permitiria que dois pedidos simultaneos com
   * o mesmo token vissem o valor antes da remocao. E dai que vem a garantia de uso unico.
   */
  async rotate(params: { tokenHash: string; newExpiresInSeconds: number }): Promise<{ token: string; userId: string } | null> {
    const userId = await redis.getdel(keyOf(params.tokenHash));
    if (!userId) return null;

    await redis.srem(indexOf(userId), params.tokenHash);
    const token = await this.issue({ userId, expiresInSeconds: params.newExpiresInSeconds });

    return { token, userId };
  }

  async revoke(params: { tokenHash: string }): Promise<void> {
    const userId = await redis.getdel(keyOf(params.tokenHash));
    if (userId) await redis.srem(indexOf(userId), params.tokenHash);
  }

  async revokeAllForUser(params: { userId: string }): Promise<void> {
    const hashes = await redis.smembers(indexOf(params.userId));
    if (hashes.length > 0) await redis.del(...hashes.map(keyOf));
    await redis.del(indexOf(params.userId));
  }
}

function hashOf(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function keyOf(tokenHash: string): string {
  return `${KEY_PREFIX}${tokenHash}`;
}

function indexOf(userId: string): string {
  return `${USER_INDEX_PREFIX}${userId}`;
}
