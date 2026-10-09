/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { SetIfAbsentParams } from '@/modules/infra/types/infra.types';

export interface InfraCacheInterface {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  /** SET NX com TTL: devolve `true` só para quem criou a chave. */
  setIfAbsent(params: SetIfAbsentParams): Promise<boolean>;
  delete(key: string): Promise<void>;
}
