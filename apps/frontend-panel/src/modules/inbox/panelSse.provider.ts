/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { ConversationEventSource, SSEProvider } from '@adatechnology/conversations-ui';

import { CONVERSATION_PATH } from '@/modules/inbox/inbox.constant';
import { HTTP_METHOD, PANEL_PATH } from '@/modules/shared/http/http.constant';
import { buildUrl, panelRequest } from '@/modules/shared/http/panelHttpClient';

type EventListener = (event: MessageEvent) => void;

/**
 * O stream abre sem cabecalho, entao a autorizacao vira bilhete.
 *
 * `EventSource` nao aceita `Authorization`. A API resolve com um bilhete de uso unico, pedido pela
 * rota autenticada e gasto na query. Pedir o bilhete e assincrono, mas `connect*` precisa devolver
 * a fonte na hora — por isso este objeto guarda os ouvintes ate a conexao real existir.
 */
export const panelSseProvider: SSEProvider = {
  connectGlobalStream: () => connect({ path: PANEL_PATH.GLOBAL_EVENTS }),
  connectConversationStream: (conversationId: string) =>
    connect({ path: CONVERSATION_PATH.EVENTS(conversationId), conversationId }),
};

type ConnectParams = {
  readonly path: string;
  readonly conversationId?: string;
};

function connect({ path, conversationId }: ConnectParams): ConversationEventSource {
  const listeners = new Set<EventListener>();

  let source: EventSource | undefined;
  let isClosed = false;

  function notify(event: MessageEvent): void {
    for (const listener of listeners) listener(event);
  }

  void issueTicket(conversationId)
    .then((ticket) => {
      if (isClosed) return;

      source = new EventSource(buildUrl(path, { ticket }));

      // A API nomeia cada evento (`mode-changed`, `data-changed`), e ouvinte de `message` nao recebe
      // evento nomeado. Como a UI so precisa saber que algo mudou, todos sao repassados sem filtro.
      for (const name of PANEL_EVENT_NAMES) {
        source.addEventListener(name, notify as unknown as globalThis.EventListener);
      }
    })
    .catch(() => undefined);

  return {
    addEventListener: (_type: string, listener: EventListener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: EventListener) => listeners.delete(listener),
    close: () => {
      isClosed = true;
      listeners.clear();
      source?.close();
    },
  };
}

/** Os nomes que o modulo publica: `data-changed` no canal global, os outros no canal da conversa. */
const PANEL_EVENT_NAMES = ['message', 'message-status', 'mode-changed', 'data-changed'] as const;

async function issueTicket(conversationId?: string): Promise<string> {
  const { ticket } = await panelRequest<{ ticket: string }>({
    path: PANEL_PATH.REALTIME_TICKETS,
    method: HTTP_METHOD.POST,
    body: conversationId ? { conversationId } : {},
  });

  return ticket;
}
