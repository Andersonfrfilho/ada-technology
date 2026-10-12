/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import {
  INFRA_DATABASE_POLL_INTERVAL_SECONDS,
  INFRA_POWER_DIRECTION,
  INFRA_SERVICE_OUTCOME,
  INFRA_STOP_VERIFY_WAIT_SECONDS,
  type InfraPowerDirection,
} from '@/modules/infra/infra.constant';
import { buildFakeGateway } from '@/modules/infra/infraFakes/buildFakeGateway';
import { buildProject } from '@/modules/infra/infraFakes/buildProject';
import { buildService } from '@/modules/infra/infraFakes/buildService';
import { RunPowerOperation } from '@/modules/infra/runPowerOperation';
import type { InfraServiceResult } from '@/modules/infra/types/infraOperation.types';
import type { RailwayServiceInstance } from '@/modules/infra/types/railwayInventory.types';
import { ERROR_CODES } from '@/shared/errors/codes';

const ENVIRONMENT_ID = 'env-staging';
const MILLISECONDS_PER_SECOND = 1000;
const MAX_POLLS = INFRA_STOP_VERIFY_WAIT_SECONDS / INFRA_DATABASE_POLL_INTERVAL_SECONDS;

const WEB = buildService({ name: 'web' });
const POSTGRES = buildService({ name: 'Postgres', image: 'postgres:16' });
const STOPPED_WEB = buildService({ name: 'web', shape: 'stopped' });
const STOPPED_POSTGRES = buildService({ name: 'Postgres', image: 'postgres:16', shape: 'stopped' });
const ZOMBIE_POSTGRES: RailwayServiceInstance = { ...STOPPED_POSTGRES, hasRunningInstance: true };

type Setup = {
  readonly gateway: ReturnType<typeof buildFakeGateway>;
  readonly sleeps: number[];
  progressCalls: number;
  readonly run: (direction?: InfraPowerDirection) => Promise<readonly InfraServiceResult[]>;
};

function buildSetup(environmentServices: (readNumber: number) => readonly RailwayServiceInstance[]): Setup {
  const gateway = buildFakeGateway({
    projects: [buildProject({ environmentId: ENVIRONMENT_ID, environmentName: 'staging', services: [WEB, POSTGRES] })],
    environmentServices,
  });
  const sleeps: number[] = [];
  const setup: Setup = {
    gateway,
    sleeps,
    progressCalls: 0,
    run: (direction = INFRA_POWER_DIRECTION.OFF) =>
      new RunPowerOperation({
        railwayGateway: gateway,
        sleep: async (milliseconds) => void sleeps.push(milliseconds),
        databaseWaitSeconds: 10,
      }).execute({
        direction,
        environmentId: ENVIRONMENT_ID,
        services: [WEB, POSTGRES],
        onProgress: async () => void (setup.progressCalls += 1),
      }),
  };
  return setup;
}

function outcomeOf(results: readonly InfraServiceResult[], serviceName: string): InfraServiceResult | undefined {
  return results.find((result) => result.serviceName === serviceName);
}

describe('RunPowerOperation (verificacao pos-parada)', () => {
  it('parada aceita mas o servico continua rodando vira failed com INFRA_SERVICE_NOT_STOPPED', async () => {
    const setup = buildSetup(() => [STOPPED_WEB, { ...STOPPED_POSTGRES, hasRunningInstance: true }]);

    const results = await setup.run();

    expect(outcomeOf(results, 'web')?.outcome).toBe(INFRA_SERVICE_OUTCOME.OK);
    expect(outcomeOf(results, 'Postgres')).toEqual({
      serviceName: 'Postgres',
      outcome: INFRA_SERVICE_OUTCOME.FAILED,
      errorCode: ERROR_CODES.infra.INFRA_SERVICE_NOT_STOPPED,
    });
  });

  it('servico que ainda aparece RUNNING no estado tambem reprova', async () => {
    const setup = buildSetup(() => [WEB, STOPPED_POSTGRES]);

    const results = await setup.run();

    expect(outcomeOf(results, 'web')?.errorCode).toBe(ERROR_CODES.infra.INFRA_SERVICE_NOT_STOPPED);
    expect(outcomeOf(results, 'Postgres')?.outcome).toBe(INFRA_SERVICE_OUTCOME.OK);
  });

  it('parado ja na primeira leitura continua ok, sem espera', async () => {
    const setup = buildSetup(() => [STOPPED_WEB, STOPPED_POSTGRES]);

    const results = await setup.run();

    expect(results.map((result) => result.outcome)).toEqual([INFRA_SERVICE_OUTCOME.OK, INFRA_SERVICE_OUTCOME.OK]);
    expect(setup.sleeps).toEqual([]);
  });

  it('para depois de algumas rodadas e renova a trava a cada espera', async () => {
    const setup = buildSetup((readNumber) => (readNumber < 3 ? [WEB, ZOMBIE_POSTGRES] : [STOPPED_WEB, STOPPED_POSTGRES]));

    const results = await setup.run();

    expect(results.every((result) => result.outcome === INFRA_SERVICE_OUTCOME.OK)).toBe(true);
    expect(setup.sleeps.length).toBeGreaterThan(0);
    expect(setup.progressCalls).toBeGreaterThanOrEqual(setup.sleeps.length);
  });

  it('leitura que falha uma vez conta como ainda nao parou e tenta de novo', async () => {
    const setup = buildSetup((readNumber) => {
      if (readNumber === 1) throw new Error('railway down');
      return [STOPPED_WEB, STOPPED_POSTGRES];
    });

    const results = await setup.run();

    expect(results.map((result) => result.outcome)).toEqual([INFRA_SERVICE_OUTCOME.OK, INFRA_SERVICE_OUTCOME.OK]);
    expect(setup.sleeps.length).toBeGreaterThan(0);
  });

  it('prazo esgotado nao trava: faz as consultas previstas e entrega failed', async () => {
    const setup = buildSetup(() => [WEB, ZOMBIE_POSTGRES]);

    const results = await setup.run();

    expect(results.every((result) => result.outcome === INFRA_SERVICE_OUTCOME.FAILED)).toBe(true);
    expect(setup.sleeps.filter((ms) => ms === INFRA_DATABASE_POLL_INTERVAL_SECONDS * MILLISECONDS_PER_SECOND).length).toBe(
      MAX_POLLS * 2,
    );
  });

  it('servico ja parado (skipped) nao entra na verificacao', async () => {
    const gateway = buildFakeGateway({
      projects: [],
      environmentServices: () => [{ ...STOPPED_WEB, hasRunningInstance: true }],
    });
    const operation = new RunPowerOperation({ railwayGateway: gateway, sleep: async () => undefined, databaseWaitSeconds: 10 });

    const results = await operation.execute({
      direction: INFRA_POWER_DIRECTION.OFF,
      environmentId: ENVIRONMENT_ID,
      services: [STOPPED_WEB],
      onProgress: async () => undefined,
    });

    expect(results).toEqual([{ serviceName: 'web', outcome: INFRA_SERVICE_OUTCOME.SKIPPED }]);
    expect(gateway.environmentReads).toBe(0);
  });

  it('ligar nao usa a verificacao de parada', async () => {
    const setup = buildSetup(() => [WEB, POSTGRES]);

    const results = await setup.run(INFRA_POWER_DIRECTION.ON);

    expect(results.every((result) => result.outcome === INFRA_SERVICE_OUTCOME.SKIPPED)).toBe(true);
    expect(setup.sleeps).toEqual([]);
  });
});
