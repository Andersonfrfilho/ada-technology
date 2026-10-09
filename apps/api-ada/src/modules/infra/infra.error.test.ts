/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { DomainError } from '@/shared/errors/AppError';
import { ERROR_CODES } from '@/shared/errors/codes';
import {
  InfraEnvironmentNotFoundError,
  InfraEnvironmentProtectedError,
  InfraInvalidScheduleError,
  InfraKeepOnUntilRequiredError,
  InfraNotConfiguredError,
  InfraOperationInProgressError,
  InfraOperationNotFoundError,
  RailwayRateLimitedError,
  RailwayRequestFailedError,
} from '@/modules/infra/infra.error';

type InfraErrorCase = {
  readonly name: string;
  readonly build: () => DomainError;
  readonly code: string;
  readonly statusCode: number;
};

const INFRA_ERROR_CASES: InfraErrorCase[] = [
  { name: 'InfraNotConfiguredError', build: () => new InfraNotConfiguredError(), code: ERROR_CODES.infra.INFRA_NOT_CONFIGURED, statusCode: 503 },
  { name: 'InfraEnvironmentProtectedError', build: () => new InfraEnvironmentProtectedError(), code: ERROR_CODES.infra.INFRA_ENVIRONMENT_PROTECTED, statusCode: 403 },
  { name: 'InfraEnvironmentNotFoundError', build: () => new InfraEnvironmentNotFoundError(), code: ERROR_CODES.infra.INFRA_ENVIRONMENT_NOT_FOUND, statusCode: 404 },
  { name: 'InfraOperationInProgressError', build: () => new InfraOperationInProgressError(), code: ERROR_CODES.infra.INFRA_OPERATION_IN_PROGRESS, statusCode: 409 },
  { name: 'InfraOperationNotFoundError', build: () => new InfraOperationNotFoundError(), code: ERROR_CODES.infra.INFRA_OPERATION_NOT_FOUND, statusCode: 404 },
  { name: 'RailwayRequestFailedError', build: () => new RailwayRequestFailedError('fetchProjects'), code: ERROR_CODES.infra.RAILWAY_REQUEST_FAILED, statusCode: 502 },
  { name: 'RailwayRateLimitedError', build: () => new RailwayRateLimitedError(), code: ERROR_CODES.infra.RAILWAY_RATE_LIMITED, statusCode: 503 },
  { name: 'InfraKeepOnUntilRequiredError', build: () => new InfraKeepOnUntilRequiredError(), code: ERROR_CODES.infra.INFRA_KEEP_ON_UNTIL_REQUIRED, statusCode: 400 },
  { name: 'InfraInvalidScheduleError', build: () => new InfraInvalidScheduleError(), code: ERROR_CODES.infra.INFRA_INVALID_SCHEDULE, statusCode: 400 },
];

describe('infra errors', () => {
  it.each(INFRA_ERROR_CASES)('$name carries its code and status', ({ name, build, code, statusCode }) => {
    const error = build();

    expect(error).toBeInstanceOf(DomainError);
    expect(error.name).toBe(name);
    expect(error.code).toBe(code);
    expect(error.statusCode).toBe(statusCode);
  });

  it.each(INFRA_ERROR_CASES)('$name message never mentions a token', ({ build }) => {
    expect(build().message).not.toMatch(/token/i);
  });
});
