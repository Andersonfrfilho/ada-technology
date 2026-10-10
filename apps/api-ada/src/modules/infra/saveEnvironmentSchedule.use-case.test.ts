/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { ACTOR_TYPE, AUDIT_ACTION, AUDIT_TARGET } from '@/modules/audit/audit.constant';
import {
  InfraEnvironmentNotFoundError,
  InfraEnvironmentProtectedError,
  InfraInvalidScheduleError,
  InfraNotConfiguredError,
} from '@/modules/infra/infra.error';
import { type PowerHarness, buildPowerHarness } from '@/modules/infra/infraFakes/buildPowerHarness';
import { buildProject } from '@/modules/infra/infraFakes/buildProject';
import { buildService } from '@/modules/infra/infraFakes/buildService';
import { SaveEnvironmentScheduleUseCase } from '@/modules/infra/saveEnvironmentSchedule.use-case';
import type { SaveEnvironmentScheduleParams } from '@/modules/infra/types/infraSchedule.types';

const ENVIRONMENT_ID = 'env-staging';
const AGENT_ID = '33333333-3333-4333-8333-333333333333';
// Sexta-feira 09:00 em Sao Paulo.
const NOW = new Date('2026-10-09T12:00:00Z');

function buildHarness(params: { readonly environmentName?: string; readonly isConfigured?: boolean } = {}): {
  readonly harness: PowerHarness;
  readonly useCase: SaveEnvironmentScheduleUseCase;
} {
  const harness = buildPowerHarness({
    ...(params.isConfigured === false ? { isConfigured: false } : {}),
    gatewayOptions: {
      projects: [
        buildProject({
          environmentId: ENVIRONMENT_ID,
          environmentName: params.environmentName ?? 'staging',
          services: [buildService({ name: 'web' })],
        }),
      ],
    },
  });
  const useCase = new SaveEnvironmentScheduleUseCase({
    resolveGateway: async () => (params.isConfigured === false ? undefined : harness.gateway),
    scheduleRepository: harness.scheduleRepository,
    recordAudit: harness.dependencies.recordAudit,
    managedPattern: 'staging',
    selfEnvironmentId: 'env-self',
    now: () => NOW,
  });
  return { harness, useCase };
}

function buildParams(overrides: Partial<SaveEnvironmentScheduleParams> = {}): SaveEnvironmentScheduleParams {
  return {
    environmentId: ENVIRONMENT_ID,
    activeWeekdays: [1, 2, 3, 4, 5],
    powerOnTime: '08:00',
    powerOffTime: '20:00',
    isEnabled: true,
    actor: { type: ACTOR_TYPE.AGENT, agentId: AGENT_ID },
    ipAddress: '203.0.113.9',
    ...overrides,
  };
}

async function expectInvalid(overrides: Partial<SaveEnvironmentScheduleParams>): Promise<InfraInvalidScheduleError> {
  const { harness, useCase } = buildHarness();
  const error = await useCase.execute(buildParams(overrides)).catch((caught: unknown) => caught);

  expect(error).toBeInstanceOf(InfraInvalidScheduleError);
  expect(harness.scheduleRepository.upsertCalls).toHaveLength(0);
  expect(harness.auditCalls).toHaveLength(0);
  return error as InfraInvalidScheduleError;
}

describe('SaveEnvironmentScheduleUseCase', () => {
  it('salva agenda valida, audita e devolve a proxima acao', async () => {
    const { harness, useCase } = buildHarness();

    const result = await useCase.execute(buildParams());

    expect(result.schedule).toMatchObject({
      railwayProjectId: 'project-1',
      railwayEnvironmentId: ENVIRONMENT_ID,
      activeWeekdays: [1, 2, 3, 4, 5],
      powerOnTime: '08:00',
      powerOffTime: '20:00',
      isEnabled: true,
      updatedByAgentId: AGENT_ID,
    });
    expect(result.nextScheduledAction).toEqual({ kind: 'power_off', at: '2026-10-09T23:00:00.000Z' });
    expect(harness.scheduleRepository.records.get(ENVIRONMENT_ID)).toBeDefined();
  });

  it('agenda pausada nao tem proxima acao', async () => {
    const result = await buildHarness().useCase.execute(buildParams({ isEnabled: false }));

    expect(result.schedule.isEnabled).toBe(false);
    expect(result.nextScheduledAction).toBeUndefined();
  });

  it('auditoria INFRA_SCHEDULE_CHANGED com metadata completo e sem segredo', async () => {
    const { harness, useCase } = buildHarness();

    await useCase.execute(buildParams());

    expect(harness.auditCalls).toHaveLength(1);
    expect(harness.auditCalls[0]).toMatchObject({
      actorType: ACTOR_TYPE.AGENT,
      actorId: AGENT_ID,
      action: AUDIT_ACTION.INFRA_SCHEDULE_CHANGED,
      targetType: AUDIT_TARGET.INFRA_ENVIRONMENT,
      targetId: ENVIRONMENT_ID,
      ipAddress: '203.0.113.9',
      metadata: {
        projectName: 'ada',
        environmentName: 'staging',
        activeWeekdays: [1, 2, 3, 4, 5],
        powerOnTime: '08:00',
        powerOffTime: '20:00',
        isEnabled: true,
      },
    });
    expect(JSON.stringify(harness.auditCalls)).not.toMatch(/token/i);
  });

  it('upsert preserva keepOnUntil e lastEvaluatedAt da agenda existente', async () => {
    const { harness, useCase } = buildHarness();
    await useCase.execute(buildParams());
    const keepOnUntil = new Date('2026-10-09T15:00:00Z');
    const lastEvaluatedAt = new Date('2026-10-09T11:59:00Z');
    await harness.scheduleRepository.recordEvaluation({ environmentId: ENVIRONMENT_ID, lastEvaluatedAt, keepOnUntil });

    const result = await useCase.execute(buildParams({ powerOnTime: '09:00', isEnabled: false }));

    expect(result.schedule).toMatchObject({ powerOnTime: '09:00', isEnabled: false, keepOnUntil, lastEvaluatedAt });
  });

  it('sem gateway responde InfraNotConfiguredError', async () => {
    const { useCase } = buildHarness({ isConfigured: false });

    await expect(useCase.execute(buildParams())).rejects.toBeInstanceOf(InfraNotConfiguredError);
  });

  it('ambiente inexistente responde InfraEnvironmentNotFoundError e nao grava', async () => {
    const { harness, useCase } = buildHarness();

    await expect(useCase.execute(buildParams({ environmentId: 'env-nope' }))).rejects.toBeInstanceOf(
      InfraEnvironmentNotFoundError,
    );
    expect(harness.scheduleRepository.upsertCalls).toHaveLength(0);
    expect(harness.auditCalls).toHaveLength(0);
  });

  it.each(['production', 'internal'])('ambiente %s (nao gerenciado) e recusado e nada e gravado', async (name) => {
    const { harness, useCase } = buildHarness({ environmentName: name });

    await expect(useCase.execute(buildParams())).rejects.toBeInstanceOf(InfraEnvironmentProtectedError);
    expect(harness.scheduleRepository.upsertCalls).toHaveLength(0);
    expect(harness.auditCalls).toHaveLength(0);
  });

  it('usa inventario fresco, sem cache', async () => {
    const { harness, useCase } = buildHarness();
    await useCase.execute(buildParams());
    await useCase.execute(buildParams());

    expect(harness.gateway.inventoryReads).toBe(2);
  });
});

describe('SaveEnvironmentScheduleUseCase - validacao', () => {
  it('recusa lista de dias vazia', async () => {
    expect((await expectInvalid({ activeWeekdays: [] })).message).toContain('ao menos um dia');
  });

  it('recusa dias repetidos', async () => {
    expect((await expectInvalid({ activeWeekdays: [1, 1] })).message).toContain('nao podem se repetir');
  });

  it.each([[[7]], [[-1]], [[1.5]]])('recusa dia fora de 0..6 (%j)', async (activeWeekdays) => {
    expect((await expectInvalid({ activeWeekdays })).message).toContain('0 (domingo) a 6');
  });

  it.each(['8:00', '24:00', '12:60', 'abc', ''])('recusa hora de ligar invalida (%j)', async (powerOnTime) => {
    expect((await expectInvalid({ powerOnTime })).message).toContain('horario de ligar deve estar no formato');
  });

  it('recusa hora de desligar invalida', async () => {
    expect((await expectInvalid({ powerOffTime: '99:99' })).message).toContain('horario de desligar');
  });

  it('recusa ligar igual ou posterior ao desligar, inclusive janela que cruza a meia-noite', async () => {
    expect((await expectInvalid({ powerOnTime: '20:00', powerOffTime: '20:00' })).message).toContain('anterior');
    expect((await expectInvalid({ powerOnTime: '22:00', powerOffTime: '06:00' })).message).toContain('meia-noite');
  });

  it('junta todos os problemas na mesma mensagem e nao expoe stack', async () => {
    const error = await expectInvalid({ activeWeekdays: [], powerOnTime: 'x' });

    expect(error.message).toContain('ao menos um dia');
    expect(error.message).toContain('horario de ligar');
    expect(error.message).not.toContain('at ');
  });

  it('aceita 00:00 a 23:59', async () => {
    const result = await buildHarness().useCase.execute(buildParams({ powerOnTime: '00:00', powerOffTime: '23:59' }));

    expect(result.schedule.powerOffTime).toBe('23:59');
  });
});
