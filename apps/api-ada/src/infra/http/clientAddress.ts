/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

const UNKNOWN_CLIENT = 'unknown';

export type ResolveClientAddressParams = {
  readonly request: Request;
  readonly socketAddress: string | undefined;
};

/**
 * O endereco do socket na Railway e o do proxy da plataforma, igual para todo mundo — sem ler o
 * `X-Forwarded-For` o limite viraria um balde unico e derrubaria visitantes legitimos junto.
 */
export function resolveClientAddress({ request, socketAddress }: ResolveClientAddressParams): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();

  return forwarded || socketAddress || UNKNOWN_CLIENT;
}
