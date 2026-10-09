/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export const INFRA_ENVIRONMENT_CLASSIFICATION = {
  MANAGED: 'managed',
  PROTECTED: 'protected',
  UNMANAGED: 'unmanaged',
} as const;
export type InfraEnvironmentClassification =
  (typeof INFRA_ENVIRONMENT_CLASSIFICATION)[keyof typeof INFRA_ENVIRONMENT_CLASSIFICATION];

export const INFRA_OPERATION_KIND = {
  POWER_OFF: 'power_off',
  POWER_ON: 'power_on',
} as const;
export type InfraOperationKind = (typeof INFRA_OPERATION_KIND)[keyof typeof INFRA_OPERATION_KIND];

export const INFRA_OPERATION_STATUS = {
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  PARTIALLY_FAILED: 'partially_failed',
  FAILED: 'failed',
} as const;
export type InfraOperationStatus = (typeof INFRA_OPERATION_STATUS)[keyof typeof INFRA_OPERATION_STATUS];

export const INFRA_OPERATION_TRIGGER = {
  MANUAL: 'manual',
  SCHEDULE: 'schedule',
} as const;
export type InfraOperationTrigger = (typeof INFRA_OPERATION_TRIGGER)[keyof typeof INFRA_OPERATION_TRIGGER];

export const INFRA_SERVICE_POWER_STATE = {
  RUNNING: 'running',
  STOPPED: 'stopped',
  NO_DEPLOYMENT: 'no_deployment',
  TRANSITIONING: 'transitioning',
} as const;
export type InfraServicePowerState = (typeof INFRA_SERVICE_POWER_STATE)[keyof typeof INFRA_SERVICE_POWER_STATE];

/** Imagem de banco em `source.image`; o nome do serviço só reforça quando a imagem vem nula. */
export const INFRA_DATABASE_IMAGE_PATTERNS = ['postgres', 'postgres-ssl', 'redis', 'mysql', 'mongo'] as const;
export const INFRA_DATABASE_NAME_PATTERN = /^(Postgres|Redis|MySQL|MongoDB)/;

export const INFRA_POWER_DIRECTION = {
  OFF: 'off',
  ON: 'on',
} as const;
export type InfraPowerDirection = (typeof INFRA_POWER_DIRECTION)[keyof typeof INFRA_POWER_DIRECTION];

export const INFRA_ENVIRONMENTS_CACHE_TTL_SECONDS = 30;
export const INFRA_COSTS_CACHE_TTL_SECONDS = 900;
export const INFRA_ACCESS_CACHE_TTL_SECONDS = 300;

export const INFRA_OPERATION_LOCK_KEY_PREFIX = 'infra:operation-lock:';

export const INFRA_KEEP_ON_UNTIL_DEFAULT_HOURS = 2;
export const INFRA_KEEP_ON_UNTIL_MAX_HOURS = 24;

export const INFRA_SCHEDULE_TIMEZONE = 'America/Sao_Paulo';

export const INFRA_ACCESS_STATUS = {
  OK: 'ok',
  TOKEN_INVALID: 'token_invalid',
  BILLING_UNAVAILABLE: 'billing_unavailable',
} as const;
export type InfraAccessStatus = (typeof INFRA_ACCESS_STATUS)[keyof typeof INFRA_ACCESS_STATUS];

export const RAILWAY_GRAPHQL_URL = 'https://backboard.railway.com/graphql/v2';
