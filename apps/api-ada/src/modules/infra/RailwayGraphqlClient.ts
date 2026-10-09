/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { RAILWAY_GRAPHQL_URL } from '@/modules/infra/infra.constant';
import {
  RailwayRateLimitedError,
  RailwayRejectedError,
  RailwayRequestFailedError,
} from '@/modules/infra/infra.error';
import { RailwayRateLimitGate } from '@/modules/infra/RailwayRateLimitGate';
import { railwayEnvelopeSchema } from '@/modules/infra/railwayGateway.schema';
import type { ExecuteRailwayParams } from '@/modules/infra/types/railwayGateway.types';

const REQUEST_TIMEOUT_MILLISECONDS = 20_000;
const HTTP_TOO_MANY_REQUESTS = 429;
const AUTH_FAILURE_STATUSES: readonly number[] = [401, 403];
const AUTH_FAILURE_MESSAGE_PATTERN = /not authorized|unauthorized|unauthenticated/i;

export type RailwayGraphqlClientDependencies = {
  readonly token: string;
  readonly fetchImplementation: typeof fetch;
  readonly now: () => number;
};

/**
 * Transporte da API GraphQL do Railway. Toda resposta e entrada nao confiavel: passa por zod, e `errors`
 * conta como falha mesmo com HTTP 200. O token so vai no header; nunca entra em mensagem, contexto de erro ou log.
 */
export class RailwayGraphqlClient {
  private readonly rateLimitGate: RailwayRateLimitGate;

  constructor(private readonly dependencies: RailwayGraphqlClientDependencies) {
    this.rateLimitGate = new RailwayRateLimitGate(dependencies.now);
  }

  async execute<TData>(params: ExecuteRailwayParams<TData>): Promise<TData> {
    const { operationName, query, variables, schema } = params;
    this.rateLimitGate.assertNotBlocked();

    try {
      const response = await this.dependencies.fetchImplementation(RAILWAY_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.dependencies.token}`,
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
      });

      if (response.status === HTTP_TOO_MANY_REQUESTS) throw this.rateLimitGate.blockAfterRateLimit(response.headers);
      if (AUTH_FAILURE_STATUSES.includes(response.status)) {
        throw new RailwayRejectedError({ operation: operationName, isAuthFailure: true });
      }
      if (!response.ok) throw new RailwayRequestFailedError(operationName);

      const envelope = railwayEnvelopeSchema.safeParse(await response.json());
      if (!envelope.success) throw new RailwayRequestFailedError(operationName);
      if (envelope.data.errors && envelope.data.errors.length > 0) {
        throw new RailwayRejectedError({
          operation: operationName,
          isAuthFailure: envelope.data.errors.some(isAuthErrorEntry),
        });
      }

      const parsed = schema.safeParse(envelope.data.data);
      if (!parsed.success) throw new RailwayRequestFailedError(operationName);

      return parsed.data;
    } catch (error) {
      if (error instanceof RailwayRateLimitedError || error instanceof RailwayRequestFailedError) throw error;

      throw new RailwayRequestFailedError(operationName);
    }
  }
}

function isAuthErrorEntry(entry: unknown): boolean {
  if (typeof entry !== 'object' || entry === null || !('message' in entry)) return false;
  return typeof entry.message === 'string' && AUTH_FAILURE_MESSAGE_PATTERN.test(entry.message);
}
