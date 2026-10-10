/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { createHash } from 'node:crypto';

import {
  INFRA_SECRET_KEY_BYTES,
  INFRA_SECRET_KEY_ID_BYTES,
} from '@/modules/infra/infraSecret.constant';
import { InfraSecretKeyInvalidError } from '@/modules/infra/infraSecret.error';

// Campo #privado + toJSON/toString/inspect redigidos: serializar ou logar a instancia nunca mostra os bytes.
export class InfraSecretKey {
  readonly #keyBytes: Uint8Array;
  readonly keyId: string;

  constructor(keyBytes: Uint8Array) {
    this.#keyBytes = keyBytes;
    this.keyId = createHash('sha256').update(keyBytes).digest().subarray(0, INFRA_SECRET_KEY_ID_BYTES).toString('hex');
  }

  use<TResult>(callback: (keyBytes: Uint8Array) => TResult): TResult {
    return callback(this.#keyBytes);
  }

  toJSON(): string {
    return `[InfraSecretKey ${this.keyId}]`;
  }

  toString(): string {
    return this.toJSON();
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return this.toJSON();
  }
}

export function loadInfraSecretKey(base64: string): InfraSecretKey {
  const keyBytes = Buffer.from(base64, 'base64');
  const isCanonical = keyBytes.toString('base64') === base64.trim();
  if (!isCanonical || keyBytes.length !== INFRA_SECRET_KEY_BYTES) throw new InfraSecretKeyInvalidError();
  return new InfraSecretKey(new Uint8Array(keyBytes));
}
