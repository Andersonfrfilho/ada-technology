/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { SseListener } from '@adatechnology/meta-whatsapp-module';

import { SECURITY_HEADERS } from '@/infra/http/responses';

/**
 * Proxy e balanceador derrubam conexao ociosa por volta de 60s; o comentario mantem o cano quente
 * sem virar evento para o navegador tratar.
 */
const HEARTBEAT_MS = 25_000;

export type CreateSseResponseParams = {
  /** Devolve a funcao de cancelamento; e chamada uma vez, quando o stream abre. */
  readonly subscribe: (emit: SseListener) => Promise<() => void>;
};

export function createSseResponse({ subscribe }: CreateSseResponseParams): Response {
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let isClosed = false;

  function release(): void {
    isClosed = true;
    if (heartbeat) clearInterval(heartbeat);
    unsubscribe?.();
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function write(chunk: string): void {
        if (isClosed) return;

        // O navegador pode sumir sem que `cancel` chegue antes do proximo envio; soltar a inscricao
        // aqui evita um listener preso a um stream que ja morreu.
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          release();
        }
      }

      unsubscribe = await subscribe((event, payload) => {
        write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
      });

      write('event: ready\ndata: {}\n\n');
      heartbeat = setInterval(() => write(': keep-alive\n\n'), HEARTBEAT_MS);
    },
    cancel: release,
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...SECURITY_HEADERS,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Nginx e o proxy do Railway seguram o corpo em buffer sem isto, e o evento so chega em lote.
      'X-Accel-Buffering': 'no',
    },
  });
}
