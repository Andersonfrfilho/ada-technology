/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */


import { ACTOR_TYPE } from '@/modules/audit/audit.constant';
import {
  INFRA_ENVIRONMENT_POWER_STATE,
  INFRA_OPERATION_TRIGGER,
  INFRA_SCHEDULE_ACTION,
  type InfraEnvironmentPowerState,
} from '@/modules/infra/infra.constant';
import { InfraEnvironmentProtectedError, InfraOperationInProgressError } from '@/modules/infra/infra.error';
import type { PowerEnvironmentUseCase } from '@/modules/infra/powerEnvironment.use-case';
import type { RecoverInterruptedInfraOperationsUseCase } from '@/modules/infra/recoverInterruptedInfraOperations.use-case';
import { resolveEnvironmentPowerState } from '@/modules/infra/resolveEnvironmentPowerState';
import { resolveScheduleAction } from '@/modules/infra/resolveScheduleAction';
import { resolveServiceErrorCode } from '@/modules/infra/resolveServiceErrorCode';
import { resolveServicePowerState } from '@/modules/infra/resolveServicePowerState';
import type {
  InfraLogger,
  InfraScheduleRecord,
  RailwayEnvironment,
  RailwayProject,
} from '@/modules/infra/types/infra.types';
import type { InfraScheduleRepositoryInterface } from '@/modules/infra/types/infraScheduleRepository.interface';
import type { RailwayGatewayInterface } from '@/modules/infra/types/railwayGateway.interface';

type PowerUseCase = Pick<PowerEnvironmentUseCase, 'execute'>;

type Dependencies = {
  readonly railwayGateway?: RailwayGatewayInterface;
  readonly scheduleRepository: InfraScheduleRepositoryInterface;
  readonly powerOnEnvironment: PowerUseCase;
  readonly powerOffEnvironment: PowerUseCase;
  readonly recoverInterruptedOperations?: Pick<RecoverInterruptedInfraOperationsUseCase, 'execute'>;
  readonly logger: InfraLogger;
  readonly now: () => Date;
};

type ProcessScheduleParams = {
  readonly schedule: InfraScheduleRecord;
  readonly inventory: readonly RailwayProject[];
  readonly now: Date;
};

type PowerAction = typeof INFRA_SCHEDULE_ACTION.POWER_ON | typeof INFRA_SCHEDULE_ACTION.POWER_OFF;

type DispatchParams = {
  readonly environmentId: string;
  readonly action: PowerAction;
  readonly now: Date;
  readonly shouldClearKeepOn: boolean;
};

const TARGET_STATE: Readonly<Record<PowerAction, InfraEnvironmentPowerState>> = {
  [INFRA_SCHEDULE_ACTION.POWER_ON]: INFRA_ENVIRONMENT_POWER_STATE.RUNNING,
  [INFRA_SCHEDULE_ACTION.POWER_OFF]: INFRA_ENVIRONMENT_POWER_STATE.STOPPED,
};

function findEnvironment(params: {
  readonly inventory: readonly RailwayProject[];
  readonly environmentId: string;
}): RailwayEnvironment | undefined {
  for (const project of params.inventory) {
    const found = project.environments.find((candidate) => candidate.id === params.environmentId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Tarefa do relogio: a cada minuto compara cada agenda ativa com o ambiente e liga/desliga sozinha.
 * Nunca cria agenda nem mexe em ambiente que nenhuma agenda cobre; a protecao de producao vive no
 * `execute` de energia, que recusa o que deixou de ser gerenciavel.
 */
export class RunInfraSchedulesUseCase {
  constructor(private readonly dependencies: Dependencies) {}

  async execute(): Promise<void> {
    const { railwayGateway, scheduleRepository, logger } = this.dependencies;
    if (!railwayGateway) return;

    await this.recoverInterruptedOperations();
    const schedules = (await scheduleRepository.listAll()).filter((schedule) => schedule.isEnabled);
    if (schedules.length === 0) return;

    const now = this.dependencies.now();
    const inventory = await railwayGateway.listInventory();
    const outcomes = await Promise.allSettled(
      schedules.map((schedule) => this.processSchedule({ schedule, inventory, now })),
    );

    outcomes.forEach((outcome, index) => {
      if (outcome.status === 'fulfilled') return;
      logger.error('Falha ao avaliar agenda de infra; nova tentativa no proximo minuto', {
        environmentId: schedules[index]?.railwayEnvironmentId,
        errorCode: resolveServiceErrorCode(outcome.reason),
      });
    });
  }

  // Fallback: recuperar historico nunca pode impedir as agendas do minuto de rodarem.
  private async recoverInterruptedOperations(): Promise<void> {
    const { recoverInterruptedOperations, logger } = this.dependencies;
    if (!recoverInterruptedOperations) return;
    try {
      const recovered = await recoverInterruptedOperations.execute();
      if (recovered > 0) logger.info('Operacoes de infra interrompidas recuperadas', { count: recovered });
    } catch (error) {
      logger.error('Falha ao recuperar operacoes de infra interrompidas', { errorCode: resolveServiceErrorCode(error) });
    }
  }

  private async processSchedule(params: ProcessScheduleParams): Promise<void> {
    const { schedule, inventory, now } = params;
    const environmentId = schedule.railwayEnvironmentId;
    const { action, shouldClearKeepOn } = resolveScheduleAction({ schedule, now });

    if (action === INFRA_SCHEDULE_ACTION.NONE) {
      await this.advance({ environmentId, now, shouldClearKeepOn });
      return;
    }

    const environment = findEnvironment({ inventory, environmentId });
    if (!environment) {
      await this.skip({ environmentId, action, now, shouldClearKeepOn, reason: 'environment_not_found' });
      return;
    }

    const state = resolveEnvironmentPowerState(environment.services.map(resolveServicePowerState));
    if (state === TARGET_STATE[action]) {
      await this.skip({ environmentId, action, now, shouldClearKeepOn, reason: 'already_in_target_state' });
      return;
    }

    await this.dispatch({ environmentId, action, now, shouldClearKeepOn });
  }

  private async dispatch(params: DispatchParams): Promise<void> {
    const { environmentId, action, now, shouldClearKeepOn } = params;
    const powerUseCase =
      action === INFRA_SCHEDULE_ACTION.POWER_ON
        ? this.dependencies.powerOnEnvironment
        : this.dependencies.powerOffEnvironment;

    try {
      await powerUseCase.execute({
        environmentId,
        actor: { type: ACTOR_TYPE.SYSTEM },
        trigger: INFRA_OPERATION_TRIGGER.SCHEDULE,
      });
    } catch (error) {
      await this.handleDispatchFailure({ error, ...params });
      return;
    }

    this.dependencies.logger.info('Agenda de infra disparou a operacao', { environmentId, action });
    await this.dependencies.scheduleRepository.recordEvaluation({
      environmentId,
      lastEvaluatedAt: now,
      ...(action === INFRA_SCHEDULE_ACTION.POWER_ON ? { lastPowerOnAt: now } : { lastPowerOffAt: now }),
      ...(shouldClearKeepOn ? { keepOnUntil: null } : {}),
    });
  }

  // Protegido avanca para nunca insistir; trava ocupada e erro externo nao avancam, e o proximo minuto retenta.
  private async handleDispatchFailure(params: DispatchParams & { readonly error: unknown }): Promise<void> {
    const { error, ...dispatch } = params;
    if (error instanceof InfraEnvironmentProtectedError) {
      await this.skip({ ...dispatch, reason: 'environment_protected' });
      return;
    }
    if (error instanceof InfraOperationInProgressError) {
      this.dependencies.logger.info('Agenda de infra adiada: operacao em andamento', {
        environmentId: dispatch.environmentId,
        action: dispatch.action,
      });
      return;
    }
    this.dependencies.logger.error('Agenda de infra falhou ao disparar a operacao', {
      environmentId: dispatch.environmentId,
      action: dispatch.action,
      errorCode: resolveServiceErrorCode(error),
    });
  }

  private async skip(params: DispatchParams & { readonly reason: string }): Promise<void> {
    this.dependencies.logger.info('Agenda de infra ignorou a acao', {
      environmentId: params.environmentId,
      action: params.action,
      reason: params.reason,
    });
    await this.advance(params);
  }

  private async advance(params: {
    readonly environmentId: string;
    readonly now: Date;
    readonly shouldClearKeepOn: boolean;
  }): Promise<void> {
    await this.dependencies.scheduleRepository.recordEvaluation({
      environmentId: params.environmentId,
      lastEvaluatedAt: params.now,
      ...(params.shouldClearKeepOn ? { keepOnUntil: null } : {}),
    });
  }
}
