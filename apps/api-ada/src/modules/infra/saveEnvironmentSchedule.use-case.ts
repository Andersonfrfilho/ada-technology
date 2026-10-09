/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { ACTOR_TYPE, AUDIT_ACTION, AUDIT_TARGET } from '@/modules/audit/audit.constant';
import type { RecordAuditLogUseCase } from '@/modules/audit/recordAuditLog.use-case';
import { InfraInvalidScheduleError, InfraNotConfiguredError } from '@/modules/infra/infra.error';
import { locateManagedEnvironment } from '@/modules/infra/locateManagedEnvironment';
import { resolveNextScheduledActionView } from '@/modules/infra/resolveNextScheduledActionView';
import { validateScheduleWindow } from '@/modules/infra/validateScheduleWindow';
import type {
  SaveEnvironmentScheduleParams,
  SaveEnvironmentScheduleResult,
} from '@/modules/infra/types/infraSchedule.types';
import type { InfraScheduleRepositoryInterface } from '@/modules/infra/types/infraScheduleRepository.interface';
import type { RailwayGatewayInterface } from '@/modules/infra/types/railwayGateway.interface';

export type SaveEnvironmentScheduleDependencies = {
  readonly railwayGateway?: RailwayGatewayInterface;
  readonly scheduleRepository: InfraScheduleRepositoryInterface;
  readonly recordAudit: Pick<RecordAuditLogUseCase, 'execute'>;
  readonly managedPattern: string;
  readonly selfEnvironmentId: string;
  readonly now?: () => Date;
};

/** Salva a agenda de um ambiente gerenciavel; protegido ou inexistente nunca grava nada. */
export class SaveEnvironmentScheduleUseCase {
  constructor(private readonly dependencies: SaveEnvironmentScheduleDependencies) {}

  async execute(params: SaveEnvironmentScheduleParams): Promise<SaveEnvironmentScheduleResult> {
    const { railwayGateway, scheduleRepository, managedPattern, selfEnvironmentId } = this.dependencies;
    if (!railwayGateway) throw new InfraNotConfiguredError();

    const issues = validateScheduleWindow(params);
    if (issues.length > 0) throw new InfraInvalidScheduleError(`Agenda invalida: ${issues.join('; ')}`);

    const { project, environment } = await locateManagedEnvironment({
      railwayGateway,
      environmentId: params.environmentId,
      managedPattern,
      selfEnvironmentId,
    });

    const schedule = await scheduleRepository.upsert({
      railwayProjectId: project.id,
      railwayEnvironmentId: environment.id,
      activeWeekdays: params.activeWeekdays,
      powerOnTime: params.powerOnTime,
      powerOffTime: params.powerOffTime,
      isEnabled: params.isEnabled,
      ...(params.actor.agentId ? { updatedByAgentId: params.actor.agentId } : {}),
    });

    await this.recordAudit({ params, projectName: project.name, environmentName: environment.name });

    const now = (this.dependencies.now ?? (() => new Date()))();
    return { schedule, nextScheduledAction: resolveNextScheduledActionView({ schedule, now }) };
  }

  private async recordAudit(params: {
    readonly params: SaveEnvironmentScheduleParams;
    readonly projectName: string;
    readonly environmentName: string;
  }): Promise<void> {
    const { params: saved, projectName, environmentName } = params;
    await this.dependencies.recordAudit.execute({
      actorType: saved.actor.type,
      ...(saved.actor.type === ACTOR_TYPE.AGENT && saved.actor.agentId ? { actorId: saved.actor.agentId } : {}),
      action: AUDIT_ACTION.INFRA_SCHEDULE_CHANGED,
      targetType: AUDIT_TARGET.INFRA_ENVIRONMENT,
      targetId: saved.environmentId,
      ...(saved.ipAddress ? { ipAddress: saved.ipAddress } : {}),
      metadata: {
        projectName,
        environmentName,
        activeWeekdays: saved.activeWeekdays,
        powerOnTime: saved.powerOnTime,
        powerOffTime: saved.powerOffTime,
        isEnabled: saved.isEnabled,
      },
    });
  }
}
