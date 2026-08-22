/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/** `2026-08-21T12:00:00.000Z` — instante em UTC, que e como o modulo serializa toda data. */
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/**
 * JSON nao tem data: o que chega da rota e texto, e a tela do pacote espera `Date`.
 *
 * Converter no cliente HTTP, e nao em cada componente, e o que impede o `startsAt.getTime is not a
 * function` aparecer so na tela que ninguem abriu ainda. O formato e estrito de proposito — texto
 * que so parece data (um nome, um codigo) nao vira `Date` por acidente.
 */
export function reviveDates<TValue>(value: TValue): TValue {
  if (typeof value === 'string') {
    return (ISO_INSTANT.test(value) ? new Date(value) : value) as TValue;
  }

  if (Array.isArray(value)) return value.map(reviveDates) as TValue;

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, item]) => [key, reviveDates(item)]);

    return Object.fromEntries(entries) as TValue;
  }

  return value;
}
