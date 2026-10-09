/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */


import { INFRA_SCHEDULE_ACTION } from '@/modules/infra/infra.constant';
import { ProcessInfraSchedule, type PowerUseCase } from '@/modules/infra/processInfraSchedule';
import type { RecoverInterruptedInfraOperationsUseCase } from '@/modules/infra/recoverInterruptedInfraOperations.use-case';
import { resolveScheduleAction } from '@/modules/infra/resolveScheduleAction';
import { resolveServiceErrorCode } from '@/modules/infra/resolveServiceErrorCode';
import type { InfraLogger } from '@/modules/infra/types/infraRuntime.types';
import type { ResolveScheduleActionResult } from '@/modules/infra/types/infraSchedule.types';
import type { InfraScheduleRepositoryInterface } from '@/modules/infra/types/infraScheduleRepository.interface';
import type { RailwayGatewayInterface } from '@/modules/infra/types/railwayGateway.interface';

type Dependencies = {
  readonly railwayGateway?: RailwayGatewayInterface;
  readonly scheduleRepository: InfraScheduleRepositoryInterface;
  readonly powerOnEnvironment: PowerUseCase;
  readonly powerOffEnvironment: PowerUseCase;
  readonly recoverInterruptedOperations?: Pick<RecoverInterruptedInfraOperationsUseCase, 'execute'>;
  readonly logger: InfraLogger;
  readonly now: () => Date;
};

/**
 * Tarefa do relogio: a cada minuto compara cada agenda ativa com o ambiente e liga/desliga sozinha.
 * Nunca cria agenda nem mexe em ambiente que nenhuma agenda cobre; a protecao de producao vive no
 * `execute` de energia, que recusa o que deixou de ser gerenciavel.
 */
export class RunInfraSchedulesUseCase {
  private readonly processInfraSchedule: ProcessInfraSchedule;

  constructor(private readonly dependencies: Dependencies) {
    this.processInfraSchedule = new ProcessInfraSchedule(dependencies);
  }

  async execute(): Promise<void> {
    const { railwayGateway, scheduleRepository, logger } = this.dependencies;
    if (!railwayGateway) return;

    await this.recoverInterruptedOperations();
    const schedules = (await scheduleRepository.listAll()).filter((schedule) => schedule.isEnabled);
    if (schedules.length === 0) return;

    const now = this.dependencies.now();
    const decisions = schedules.map((schedule) => resolveScheduleAction({ schedule, now }));
    // Quase todo minuto não há nada a executar: ler o inventário só quando uma agenda precisa dele.
    const hasAction = decisions.some((decision) => decision.action !== INFRA_SCHEDULE_ACTION.NONE);
    const inventory = hasAction ? await railwayGateway.listInventory() : [];
    const outcomes = await Promise.allSettled(
      schedules.map((schedule, index) =>
        this.processInfraSchedule.execute({ schedule, decision: decisions[index] as ResolveScheduleActionResult, inventory, now }),
      ),
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
}
