/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { environment } from '@/infra/config/environment';
import { redactLogMeta } from '@/shared/redaction';

const LOG_LEVELS = {
  error: 10,
  warn: 20,
  info: 30,
  debug: 40,
} as const;

export type LogLevel = keyof typeof LOG_LEVELS;

export type LogEntryParams = {
  readonly message: string;
  readonly source: string;
  readonly traceId?: string;
  readonly traceStack?: readonly string[];
  readonly library?: string;
  readonly meta?: Record<string, unknown>;
};

const activeThreshold = LOG_LEVELS[environment.LOG_LEVEL];

function shouldEmit(level: LogLevel): boolean {
  return LOG_LEVELS[level] <= activeThreshold;
}

function emit(level: LogLevel, params: LogEntryParams): void {
  if (!shouldEmit(level)) return;

  const entry = {
    traceId: params.traceId ?? '-',
    timestamp: new Date().toISOString(),
    appName: environment.APP_NAME,
    traceStack: params.traceStack ?? [],
    source: params.source,
    lib: params.library ?? '-',
    level: level.toUpperCase(),
    message: params.message,
    meta: redactLogMeta(params.meta ?? {}),
  };

  const line = JSON.stringify(entry);

  if (level === 'error') {
    process.stderr.write(`${line}\n`);
    return;
  }

  process.stdout.write(`${line}\n`);
}

export const logger = {
  error: (params: LogEntryParams): void => emit('error', params),
  warn: (params: LogEntryParams): void => emit('warn', params),
  info: (params: LogEntryParams): void => emit('info', params),
  debug: (params: LogEntryParams): void => emit('debug', params),
};
