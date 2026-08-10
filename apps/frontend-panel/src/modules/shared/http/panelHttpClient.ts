/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { environment } from '@/modules/shared/config/environment';
import { AUTH_PATH, HTTP_METHOD, HTTP_STATUS, type HttpMethod } from '@/modules/shared/http/http.constant';
import { PanelApiError, toNetworkError } from '@/modules/shared/http/http.error';
import { useSessionStore } from '@/modules/shared/session/session.store';
import type { PanelSession } from '@/modules/shared/session/types/session.types';

export type PanelRequest = {
  readonly path: string;
  readonly method?: HttpMethod;
  readonly body?: unknown;
  readonly query?: Readonly<Record<string, string | number | boolean | undefined>>;
};

/**
 * Uma renovacao por vez.
 *
 * A tela dispara varias chamadas juntas ao abrir, e todas expiram no mesmo instante. Sem esta
 * promessa compartilhada cada uma giraria o refresh token — e a rotacao invalida o anterior, entao a
 * segunda derrubaria a sessao que a primeira acabou de renovar.
 */
let pendingRefresh: Promise<boolean> | undefined;

export type PanelPagination = {
  readonly total: number;
  readonly page: number;
  readonly perPage: number;
};

export type PanelList<TItem> = {
  readonly items: readonly TItem[];
  readonly pagination: PanelPagination;
};

export async function panelRequest<TResult>(request: PanelRequest): Promise<TResult> {
  return execute(request, (response) => unwrap<TResult>(response));
}

/** Rota paginada: o `pagination` do envelope e o que diz em qual pagina de quantas a tela esta. */
export async function panelListRequest<TItem>(request: PanelRequest): Promise<PanelList<TItem>> {
  return execute(request, (response) => unwrapList<TItem>(response));
}

async function execute<TResult>(
  request: PanelRequest,
  read: (response: Response) => Promise<TResult>,
): Promise<TResult> {
  const response = await send(request);

  if (response.status !== HTTP_STATUS.UNAUTHORIZED) return read(response);
  if (!(await refreshSession())) return read(response);

  return read(await send(request));
}

export function buildUrl(path: string, query?: PanelRequest['query']): URL {
  const url = new URL(path, environment.VITE_API_BASE_URL);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  return url;
}

/** Sempre com credenciais: o refresh vive num cookie `HttpOnly`, e o `fetch` so o envia se pedirmos. */
async function send({ path, method, body, query }: PanelRequest): Promise<Response> {
  const { accessToken } = useSessionStore.getState();

  try {
    return await fetch(buildUrl(path, query), {
      method: method ?? HTTP_METHOD.GET,
      credentials: 'include',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw toNetworkError();
  }
}

async function refreshSession(): Promise<boolean> {
  pendingRefresh ??= rotateSession().finally(() => {
    pendingRefresh = undefined;
  });

  return pendingRefresh;
}

/**
 * `fetch` cru de proposito: passar por `panelRequest` faria a propria rota de renovacao tentar
 * renovar-se ao receber 401, e a recursao so pararia no fim da pilha.
 */
async function rotateSession(): Promise<boolean> {
  const response = await (async () => {
    try {
      return await fetch(buildUrl(AUTH_PATH.REFRESH), {
        method: HTTP_METHOD.POST,
        credentials: 'include',
      });
    } catch {
      throw toNetworkError();
    }
  })();

  if (!response.ok) {
    useSessionStore.getState().markAnonymous();

    return false;
  }

  useSessionStore.getState().signIn(await unwrap<PanelSession>(response));

  return true;
}

const EMPTY_RESULT = undefined as never;

async function unwrap<TResult>(response: Response): Promise<TResult> {
  if (response.status === HTTP_STATUS.NO_CONTENT) return EMPTY_RESULT;

  const envelope = (await response.json()) as Envelope<TResult>;

  if (response.ok && envelope.data !== undefined) return envelope.data;

  throw toApiError(response, envelope);
}

async function unwrapList<TItem>(response: Response): Promise<PanelList<TItem>> {
  const envelope = (await response.json()) as Envelope<readonly TItem[]>;

  if (response.ok && envelope.data && envelope.pagination) {
    return { items: envelope.data, pagination: envelope.pagination };
  }

  throw toApiError(response, envelope);
}

type Envelope<TData> = {
  readonly data?: TData;
  readonly pagination?: PanelPagination;
  readonly error?: { readonly code: string; readonly message: string };
};

function toApiError(response: Response, envelope: Envelope<unknown>): PanelApiError {
  return new PanelApiError({
    code: envelope.error?.code ?? 'UNKNOWN_ERROR',
    message: envelope.error?.message ?? response.statusText,
    status: response.status,
  });
}
