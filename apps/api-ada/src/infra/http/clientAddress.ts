/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { isIP } from 'node:net';

const UNKNOWN_CLIENT = 'unknown';

export type ResolveClientAddressParams = {
  readonly request: Request;
  readonly socketAddress: string | undefined;
};

/**
 * Na Railway o `X-Real-IP` identifica o cliente remoto (documentacao de networking, specs e limites).
 * O `X-Forwarded-For` nao serve: o cliente envia o proprio e o primeiro valor e o dele.
 * Sem `X-Real-IP` valido cai no socket, que atras do proxy e igual para todos — pior que o IP real,
 * mas nao forjavel.
 */
export function resolveClientAddress({ request, socketAddress }: ResolveClientAddressParams): string {
  const realIp = request.headers.get('x-real-ip')?.trim();

  if (realIp && isIP(realIp) !== 0) return realIp;

  return socketAddress || UNKNOWN_CLIENT;
}
