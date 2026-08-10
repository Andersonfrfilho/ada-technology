/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { toTranscript } from './widget.mapper';
import { TRANSCRIPT_LIMIT, WIDGET_PATH } from './widget.constant';
import type {
  PostMessageParams,
  PostMessageResult,
  SubscribeParams,
  WidgetApiParams,
  WidgetTranscript,
} from './types/widget.types';

/** A API responde sempre `{ data }`; erro nunca chega aqui como corpo util. */
async function readData(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error(`widget request failed: ${response.status}`);

  const body: unknown = await response.json();

  return typeof body === 'object' && body !== null && 'data' in body ? body.data : undefined;
}

/**
 * Cliente das rotas do widget, amarrado a uma origem so.
 *
 * A origem chega de fora porque muda por ambiente e a rota do servidor confere o `Origin` — dominio
 * chutado no codigo daria erro de CORS silencioso em producao.
 */
export class WidgetApi {
  readonly #baseUrl: string;

  constructor({ baseUrl }: WidgetApiParams) {
    this.#baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async createSession(): Promise<string> {
    const response = await fetch(`${this.#baseUrl}${WIDGET_PATH.SESSIONS}`, { method: 'POST' });
    const data = await readData(response);

    if (typeof data !== 'object' || data === null || !('sessionId' in data)) {
      throw new Error('widget session response has no sessionId');
    }
    if (typeof data.sessionId !== 'string') throw new Error('widget sessionId is not a string');

    return data.sessionId;
  }

  async postMessage({ sessionId, text }: PostMessageParams): Promise<PostMessageResult> {
    const response = await fetch(`${this.#baseUrl}${WIDGET_PATH.MESSAGES(sessionId)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await readData(response);
    const outcome =
      typeof data === 'object' && data !== null && 'outcome' in data && typeof data.outcome === 'string'
        ? data.outcome
        : '';

    return { outcome };
  }

  async listMessages(sessionId: string): Promise<WidgetTranscript> {
    const url = `${this.#baseUrl}${WIDGET_PATH.MESSAGES(sessionId)}?limit=${TRANSCRIPT_LIMIT}`;
    const response = await fetch(url);

    return toTranscript(await readData(response));
  }

  /**
   * O evento so avisa que mudou; quem le a conversa e a rota do transcript.
   *
   * `EventSource` ja reconecta sozinho, entao nao ha retry aqui — o retorno serve para desligar a
   * assinatura quando o elemento sai do DOM.
   */
  subscribe({ sessionId, onChange }: SubscribeParams): () => void {
    const source = new EventSource(`${this.#baseUrl}${WIDGET_PATH.EVENTS(sessionId)}`);
    source.addEventListener('message', onChange);

    return () => source.close();
  }
}
