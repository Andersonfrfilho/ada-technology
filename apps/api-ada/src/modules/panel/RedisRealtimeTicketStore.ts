/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { randomBytes } from 'node:crypto';

import { redis } from '@/infra/cache/redisClient';
import { SSE_TICKET_TTL_SECONDS } from '@/modules/panel/panel.constant';
import type {
  RealtimeTicketPayload,
  RealtimeTicketStoreInterface,
} from '@/modules/panel/types/panel.types';

const KEY_PREFIX = 'panel:sse:';
const TICKET_BYTES = 32;

/**
 * Autorizacao do stream, ja que `EventSource` nao manda header.
 *
 * O bilhete e emitido numa rota autenticada, vale trinta segundos e morre no primeiro uso — se
 * vazar no log do proxy, quase certamente ja nao vale mais. O que ele autoriza vive aqui dentro:
 * o navegador recebe so a chave.
 */
export class RedisRealtimeTicketStore implements RealtimeTicketStoreInterface {
  async issue(payload: RealtimeTicketPayload): Promise<string> {
    const ticket = randomBytes(TICKET_BYTES).toString('base64url');
    await redis.set(keyOf(ticket), JSON.stringify(payload), 'EX', SSE_TICKET_TTL_SECONDS);

    return ticket;
  }

  /** `GETDEL` num comando so: ler e apagar em duas idas deixaria duas conexoes usarem o mesmo bilhete. */
  async redeem(ticket: string): Promise<RealtimeTicketPayload | undefined> {
    const stored = await redis.getdel(keyOf(ticket));
    if (!stored) return undefined;

    return JSON.parse(stored) as RealtimeTicketPayload;
  }
}

function keyOf(ticket: string): string {
  return `${KEY_PREFIX}${ticket}`;
}
