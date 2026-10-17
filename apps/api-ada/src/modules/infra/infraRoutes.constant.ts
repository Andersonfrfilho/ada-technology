/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export const INFRA_ENVIRONMENTS_PATH = '/v1/panel/infra/environments';
export const INFRA_ENVIRONMENT_PATH = `${INFRA_ENVIRONMENTS_PATH}/:environmentId`;
export const INFRA_OPERATION_PATH = '/v1/panel/infra/operations/:operationId';
export const INFRA_COSTS_PATH = '/v1/panel/infra/costs';
export const INFRA_POWER_OFF_AGENT_BUCKET = 'POST:infra-power-off:agent';
export const INFRA_POWER_ON_AGENT_BUCKET = 'POST:infra-power-on:agent';
export const INFRA_INTEGRATION_PATH = '/v1/panel/infra/integration';
export const INFRA_INTEGRATION_VERIFY_PATH = `${INFRA_INTEGRATION_PATH}/verify`;
export const INFRA_INTEGRATION_SAVE_AGENT_BUCKET = 'PUT:infra-integration:agent';
export const INFRA_INTEGRATION_REMOVE_AGENT_BUCKET = 'DELETE:infra-integration:agent';
export const INFRA_INTEGRATION_VERIFY_AGENT_BUCKET = 'POST:infra-integration-verify:agent';
