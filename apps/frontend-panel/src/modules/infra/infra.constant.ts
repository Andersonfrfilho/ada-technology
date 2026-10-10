/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export const INFRA_ACCESS_STATUS = {
  OK: 'ok',
  TOKEN_INVALID: 'token_invalid',
  BILLING_UNAVAILABLE: 'billing_unavailable',
  UNAVAILABLE: 'unavailable',
} as const;
export type InfraAccessStatus = (typeof INFRA_ACCESS_STATUS)[keyof typeof INFRA_ACCESS_STATUS];

export const INFRA_ENVIRONMENT_CLASSIFICATION = {
  MANAGED: 'managed',
  PROTECTED: 'protected',
  UNMANAGED: 'unmanaged',
} as const;
export type InfraEnvironmentClassification =
  (typeof INFRA_ENVIRONMENT_CLASSIFICATION)[keyof typeof INFRA_ENVIRONMENT_CLASSIFICATION];

export const INFRA_ENVIRONMENT_POWER_STATE = {
  RUNNING: 'running',
  STOPPED: 'stopped',
  PARTIAL: 'partial',
  TRANSITIONING: 'transitioning',
} as const;
export type InfraEnvironmentPowerState =
  (typeof INFRA_ENVIRONMENT_POWER_STATE)[keyof typeof INFRA_ENVIRONMENT_POWER_STATE];

export const INFRA_SERVICE_POWER_STATE = {
  RUNNING: 'running',
  STOPPED: 'stopped',
  NO_DEPLOYMENT: 'no_deployment',
  TRANSITIONING: 'transitioning',
} as const;
export type InfraServicePowerState = (typeof INFRA_SERVICE_POWER_STATE)[keyof typeof INFRA_SERVICE_POWER_STATE];

export const INFRA_OPERATION_KIND = { POWER_OFF: 'power_off', POWER_ON: 'power_on' } as const;
export type InfraOperationKind = (typeof INFRA_OPERATION_KIND)[keyof typeof INFRA_OPERATION_KIND];

export const INFRA_OPERATION_STATUS = {
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  PARTIALLY_FAILED: 'partially_failed',
  FAILED: 'failed',
} as const;
export type InfraOperationStatus = (typeof INFRA_OPERATION_STATUS)[keyof typeof INFRA_OPERATION_STATUS];

export const INFRA_OPERATION_TRIGGER = { MANUAL: 'manual', SCHEDULE: 'schedule' } as const;
export type InfraOperationTrigger = (typeof INFRA_OPERATION_TRIGGER)[keyof typeof INFRA_OPERATION_TRIGGER];

export const INFRA_SERVICE_OUTCOME = { OK: 'ok', FAILED: 'failed', SKIPPED: 'skipped' } as const;
export type InfraServiceOutcome = (typeof INFRA_SERVICE_OUTCOME)[keyof typeof INFRA_SERVICE_OUTCOME];

export const INFRA_SCHEDULED_ACTION_KIND = { POWER_ON: 'power_on', POWER_OFF: 'power_off' } as const;
export type InfraScheduledActionKind =
  (typeof INFRA_SCHEDULED_ACTION_KIND)[keyof typeof INFRA_SCHEDULED_ACTION_KIND];

/** Codigos de erro de dominio da API que a tela de infra traduz. */
export const INFRA_ERROR_CODE = {
  NOT_CONFIGURED: 'INFRA_NOT_CONFIGURED',
  ENVIRONMENT_PROTECTED: 'INFRA_ENVIRONMENT_PROTECTED',
  OPERATION_IN_PROGRESS: 'INFRA_OPERATION_IN_PROGRESS',
  KEEP_ON_UNTIL_REQUIRED: 'INFRA_KEEP_ON_UNTIL_REQUIRED',
  INVALID_SCHEDULE: 'INFRA_INVALID_SCHEDULE',
  RAILWAY_REQUEST_FAILED: 'RAILWAY_REQUEST_FAILED',
  RAILWAY_RATE_LIMITED: 'RAILWAY_RATE_LIMITED',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export const INFRA_QUERY_KEY = {
  ENVIRONMENTS: 'infra-environments',
  COSTS: 'infra-costs',
  INTEGRATION: 'infra-integration',
} as const;

export const INFRA_POLL_INTERVAL_MS = 15_000;
export const INFRA_COSTS_STALE_TIME_MS = 5 * 60_000;
