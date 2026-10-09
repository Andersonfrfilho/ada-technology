/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export type InfraLogger = {
  info(message: string, meta: Readonly<Record<string, unknown>>): void;
  error(message: string, meta: Readonly<Record<string, unknown>>): void;
};

export type InfraSleep = (milliseconds: number) => Promise<void>;
