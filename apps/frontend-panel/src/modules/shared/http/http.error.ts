/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { API_ERROR_CODE } from '@/modules/shared/http/http.constant';

/**
 * O erro da API com o codigo preservado.
 *
 * A tela decide o que dizer pelo `code`, nunca pela `message`: a mensagem e texto de servidor, pode
 * mudar sem aviso e nao esta traduzida para o atendente.
 */
export class PanelApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor({ code, message, status }: { code: string; message: string; status: number }) {
    super(message);
    this.name = 'PanelApiError';
    this.code = code;
    this.status = status;
  }
}

const NETWORK_STATUS = 0;

/** `fetch` so rejeita quando a rede falha; sem isso a queda da API chegaria a tela como erro anonimo. */
export function toNetworkError(): PanelApiError {
  return new PanelApiError({
    code: API_ERROR_CODE.NETWORK_UNREACHABLE,
    message: 'network unreachable',
    status: NETWORK_STATUS,
  });
}
