/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export type AppErrorParams = {
  readonly code: string;
  readonly message: string;
  readonly statusCode: number;
  readonly context?: Readonly<Record<string, unknown>>;
};

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly context: Readonly<Record<string, unknown>>;

  constructor({ code, message, statusCode, context }: AppErrorParams) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
    this.context = context ?? {};
    Error.captureStackTrace?.(this, new.target);
  }
}

export class DomainError extends AppError {}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
