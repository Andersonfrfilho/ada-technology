/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { timingSafeEqual } from 'node:crypto';

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { HonoAdapter } from '@bull-board/hono';
import type { Queue } from 'bullmq';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';

import { environment } from '@/infra/config/environment';
import { BULL_BOARD_BASE_PATH, BULL_BOARD_REALM } from '@/infra/queue/bullBoard.constant';

/**
 * O painel da fila, montado so quando ha credencial.
 *
 * Ele NAO entra no roteador da API: o Bull Board serve dezenas de caminhos sob um prefixo (assets,
 * chamadas internas), e o roteador daqui casa caminho exato. A delegacao acontece antes dele, por
 * prefixo, no `index.ts`.
 *
 * Autenticacao BASIC, e nao o JWT do painel: isto e uma UI que o navegador abre direto, e um token
 * em memoria do SPA nao acompanha navegacao para outro caminho. Basic e o que funciona para painel
 * operacional, e e o que o `security.md` §2 contempla — a exigencia dele nao e o esquema, e sim
 * nunca subir com credencial default.
 */
export function createBullBoardHandler(queue: Queue): (request: Request) => Promise<Response> {
  const serverAdapter = new HonoAdapter(serveStatic);
  serverAdapter.setBasePath(BULL_BOARD_BASE_PATH);

  createBullBoard({ queues: [new BullMQAdapter(queue)], serverAdapter });

  const app = new Hono();
  app.route(BULL_BOARD_BASE_PATH, serverAdapter.registerPlugin());

  return async function handleBullBoard(request: Request): Promise<Response> {
    if (!isAuthorized(request)) {
      return new Response('Unauthorized', {
        status: 401,
        headers: { 'WWW-Authenticate': `Basic realm="${BULL_BOARD_REALM}", charset="UTF-8"` },
      });
    }

    return app.fetch(request);
  };
}

/**
 * Comparacao em tempo constante sobre digests de tamanho fixo (`security.md` §2).
 *
 * `timingSafeEqual` cru exige buffers do mesmo tamanho e lanca quando diferem — o que vazaria o
 * comprimento da senha pelo proprio erro. Comparar os SHA-256 resolve os dois: tamanho sempre igual,
 * e o tempo nao depende do conteudo.
 */
function isAuthorized(request: Request): boolean {
  const header = request.headers.get('authorization') ?? '';
  if (!header.startsWith('Basic ')) return false;

  const [user = '', password = ''] = atob(header.slice('Basic '.length)).split(':');

  return equalsInConstantTime(user, environment.BULL_BOARD_USER) &&
    equalsInConstantTime(password, environment.BULL_BOARD_PASSWORD);
}

function equalsInConstantTime(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftDigest = Bun.CryptoHasher.hash('sha256', encoder.encode(left));
  const rightDigest = Bun.CryptoHasher.hash('sha256', encoder.encode(right));

  return timingSafeEqual(leftDigest, rightDigest);
}
