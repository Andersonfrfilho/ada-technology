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

  /**
   * Derruba TODAS as sessoes de um agente. Usado na redefinicao de senha.
   *
   * Sem isto a redefinicao seria meia medida: quem redefine costuma redefinir porque perdeu o
   * controle da conta, e o refresh antigo continuaria valendo por sete dias — mantendo de pe
   * exatamente o acesso que a troca deveria cortar.
   *
   * `SCAN`, e nao `KEYS`: `KEYS` percorre o keyspace inteiro num comando unico e bloqueia o Redis,
   * que aqui tambem serve cache e fila. Redefinicao e rara e pode pagar varias voltas curtas; uma
   * pausa no Redis, nao.
   */
  async revokeAllFor(agentId: string): Promise<number> {
    let cursor = '0';
    let revoked = 0;

    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', `${KEY_PREFIX}*`, 'COUNT', SCAN_BATCH);
      cursor = next;

      if (keys.length > 0) {
        // Um `MGET` por lote em vez de um `GET` por chave: a lista ja esta em maos, e ir uma vez por
        // token multiplicaria a ida ao Redis pelo numero de sessoes abertas no produto inteiro.
        const owners = await redis.mget(...keys);
        const mine = keys.filter((_, index) => owners[index] === agentId);

        if (mine.length > 0) {
          await redis.del(...mine);
          revoked += mine.length;
        }
      }
    } while (cursor !== '0');

    return revoked;
  }
}

/**
 * Lote do `SCAN`. Alto o bastante para nao render dezenas de voltas, baixo o bastante para cada
 * volta continuar sendo barata.
 */
const SCAN_BATCH = 200;

function keyOf(token: string): string {
  return `${KEY_PREFIX}${token}`;
}
