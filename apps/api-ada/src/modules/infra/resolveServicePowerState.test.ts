/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { resolveServicePowerState } from '@/modules/infra/resolveServicePowerState';
import type { RailwayServiceInstance } from '@/modules/infra/types/infra.types';

function buildService(overrides: Partial<RailwayServiceInstance>): RailwayServiceInstance {
  return {
    serviceId: 'svc-1',
    serviceName: 'app',
    hasDeployment: true,
    isStopped: false,
    instanceStatus: 'RUNNING',
    ...overrides,
  };
}

function buildServiceWithoutInstanceStatus(overrides: Partial<RailwayServiceInstance>): RailwayServiceInstance {
  const { instanceStatus: _omitted, ...service } = buildService(overrides);
  return service;
}

describe('resolveServicePowerState', () => {
  it('returns no_deployment when there is no deployment', () => {
    expect(resolveServicePowerState(buildServiceWithoutInstanceStatus({ hasDeployment: false }))).toBe(
      'no_deployment',
    );
  });

  it('returns stopped when the deployment is stopped', () => {
    expect(resolveServicePowerState(buildService({ isStopped: true, instanceStatus: 'EXITED' }))).toBe('stopped');
  });

  it('does not treat a SUCCESS deployment with deploymentStopped as running', () => {
    expect(resolveServicePowerState(buildService({ isStopped: true, instanceStatus: 'RUNNING' }))).toBe('stopped');
  });

  it('returns running when not stopped and instance is RUNNING', () => {
    expect(resolveServicePowerState(buildService({}))).toBe('running');
  });

  it('returns transitioning for INITIALIZING', () => {
    expect(resolveServicePowerState(buildService({ instanceStatus: 'INITIALIZING' }))).toBe('transitioning');
  });

  it('returns transitioning for EXITED without isStopped', () => {
    expect(resolveServicePowerState(buildService({ instanceStatus: 'EXITED' }))).toBe('transitioning');
  });

  it('returns transitioning when instanceStatus is missing', () => {
    expect(resolveServicePowerState(buildServiceWithoutInstanceStatus({}))).toBe('transitioning');
  });
});
