/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { randomUUID } from 'node:crypto';

import { ACTOR_TYPE, AUDIT_ACTION, AUDIT_TARGET } from '@/modules/audit/audit.constant';
import type { RecordAuditLogUseCase } from '@/modules/audit/recordAuditLog.use-case';
import {
  INFRA_INVENTORY_CACHE_KEY,
  INFRA_KEEP_ON_UNTIL_MAX_HOURS,
  INFRA_OPERATION_TRIGGER,
  INFRA_OPERATION_KIND,
  INFRA_OPERATION_LOCK_GRACE_SECONDS,
  INFRA_OPERATION_LOCK_KEY_PREFIX,
  INFRA_OPERATION_STATUS,
  INFRA_POWER_DIRECTION,
  type InfraOperationStatus,
  type InfraPowerDirection,
} from '@/modules/infra/infra.constant';
import {
  InfraKeepOnUntilRequiredError,
  InfraNotConfiguredError,
  InfraOperationInProgressError,
} from '@/modules/infra/infra.error';
import { locateManagedEnvironment } from '@/modules/infra/locateManagedEnvironment';
import {
  buildPowerDeniedEntry,
  buildPowerRequestedEntry,
  resolveDenialReason,
} from '@/modules/infra/powerAuditEntries';
import { recordInfraAudit } from '@/modules/infra/recordInfraAudit';
import { countServiceOutcomes, resolveOperationStatus } from '@/modules/infra/resolveOperationStatus';
import { isInsideScheduleWindow } from '@/modules/infra/resolveScheduleAction';
import { resolveServiceErrorCode } from '@/modules/infra/resolveServiceErrorCode';
import { RunPowerOperation } from '@/modules/infra/runPowerOperation';
import type {
  InfraLogger,
  InfraOperationRecord,
  InfraServiceResult,
  InfraSleep,
  PowerEnvironmentParams,
  PowerEnvironmentResult,
  RailwayEnvironment,
  RailwayProject,
  RunOperationParams,
} from '@/modules/infra/types/infra.types';
import type { InfraCacheInterface } from '@/modules/infra/types/infraCache.interface';
import type { InfraOperationRepositoryInterface } from '@/modules/infra/types/infraOperationRepository.interface';
import type { InfraScheduleRepositoryInterface } from '@/modules/infra/types/infraScheduleRepository.interface';
import type { RailwayGatewayInterface } from '@/modules/infra/types/railwayGateway.interface';

export type PowerEnvironmentDependencies = {
  readonly railwayGateway?: RailwayGatewayInterface;
  readonly cache: InfraCacheInterface;
  readonly operationRepository: InfraOperationRepositoryInterface;
  readonly scheduleRepository: InfraScheduleRepositoryInterface;
  readonly recordAudit: Pick<RecordAuditLogUseCase, 'execute'>;
  readonly logger: InfraLogger;
  readonly sleep: InfraSleep;
  readonly managedPattern: string;
  readonly selfEnvironmentId: string;
  readonly databaseWaitSeconds: number;
  readonly now: () => Date;
};

type Dependencies = PowerEnvironmentDependencies & { readonly direction: InfraPowerDirection };

const MS_PER_HOUR = 3_600_000;

type AdmitParams = {
  readonly params: PowerEnvironmentParams;
  readonly railwayGateway: RailwayGatewayInterface;
};

type Admission = {
  readonly project: RailwayProject;
  readonly environment: RailwayEnvironment;
  readonly keepOnUntilChange: Date | null | undefined;
  readonly lockOwner: string;
};

type LockParams = {
  readonly environmentId: string;
  readonly lockOwner: string;
};

type OutcomeParams = {
  readonly params: RunOperationParams;
  readonly status: InfraOperationStatus;
  readonly serviceResults: readonly InfraServiceResult[];
};

/**
 * Liga ou desliga um ambiente. O `execute` valida, trava e cria a operacao; o trabalho de verdade roda
 * em segundo plano em `runOperation`, para a rota responder 202 antes de o Railway terminar.
 *
 * Ambiente `unmanaged` e recusado com o mesmo erro do protegido: o que nao e gerenciavel pelo painel
 * nao ganha botao de ligar/desligar, e a resposta 403 e a mesma.
 */
export class PowerEnvironmentUseCase {
  constructor(private readonly dependencies: Dependencies) {}

  async execute(params: PowerEnvironmentParams): Promise<PowerEnvironmentResult> {
    const { direction, logger } = this.dependencies;
    const railwayGateway = this.requireGateway();

    const { project, environment, keepOnUntilChange, lockOwner } = await this.admitOrAuditDenial({
      params,
      railwayGateway,
    });
    const operation = await this.registerOperationReleasingLockOnFailure({
      params,
      project,
      keepOnUntilChange,
      lockOwner,
    });
    await this.invalidateInventory();
    await recordInfraAudit({
      recordAudit: this.dependencies.recordAudit,
      logger,
      entry: buildPowerRequestedEntry({
        params,
        direction,
        operationId: operation.id,
        projectName: project.name,
        environmentName: environment.name,
      }),
    });

    const runParams: RunOperationParams = {
      operationId: operation.id,
      projectId: project.id,
      projectName: project.name,
      environmentId: environment.id,
      environmentName: environment.name,
      services: environment.services,
      actor: params.actor,
      trigger: params.trigger,
      lockOwner,
      ...(params.ipAddress ? { ipAddress: params.ipAddress } : {}),
    };
    void this.runOperation(runParams).catch((error: unknown) => {
      logger.error('Falha inesperada no runner de infra', {
        operationId: operation.id,
        direction,
        errorCode: resolveServiceErrorCode(error),
      });
    });

    return { operationId: operation.id };
  }

  // Fallback de auditoria: a recusa e registrada e o MESMO erro segue para o chamador.
  private async admitOrAuditDenial(params: AdmitParams): Promise<Admission> {
    try {
      return await this.admit(params);
    } catch (error) {
      const reason = resolveDenialReason(error);
      if (reason) {
        await recordInfraAudit({
          recordAudit: this.dependencies.recordAudit,
          logger: this.dependencies.logger,
          entry: buildPowerDeniedEntry({ params: params.params, direction: this.dependencies.direction, reason }),
        });
      }
      throw error;
    }
  }

  private async admit(params: AdmitParams): Promise<Admission> {
    const { managedPattern, selfEnvironmentId, cache } = this.dependencies;
    const { project, environment } = await locateManagedEnvironment({
      railwayGateway: params.railwayGateway,
      environmentId: params.params.environmentId,
      managedPattern,
      selfEnvironmentId,
    });
    // Antes da trava e de qualquer operacao: um keepOnUntil recusado nao pode deixar rastro.
    const keepOnUntilChange = await this.resolveKeepOnUntilChange({
      params: params.params,
      environmentId: environment.id,
    });

    const lockOwner = randomUUID();
    const isLockAcquired = await cache.setIfAbsent({
      key: this.lockKey(environment.id),
      value: lockOwner,
      ttlSeconds: this.lockTtlSeconds(),
    });
    if (!isLockAcquired) throw new InfraOperationInProgressError();

    return { project, environment, keepOnUntilChange, lockOwner };
  }

  /** Nunca rejeita: qualquer falha marca a operacao como `failed`, e a trava e sempre liberada. */
  async runOperation(params: RunOperationParams): Promise<void> {
    try {
      const serviceResults = await this.buildRunner().execute({
        direction: this.dependencies.direction,
        environmentId: params.environmentId,
        services: params.services,
        onProgress: () => this.renewLock(params),
      });
      await this.completeOperation({ params, status: resolveOperationStatus({ serviceResults }), serviceResults });
    } catch (error) {
      await this.failOperation({ params, error });
    } finally {
      await this.releaseLock(params);
    }
  }

  private requireGateway(): RailwayGatewayInterface {
    const { railwayGateway } = this.dependencies;
    if (!railwayGateway) throw new InfraNotConfiguredError();
    return railwayGateway;
  }

  private buildRunner(): RunPowerOperation {
    const { sleep, databaseWaitSeconds } = this.dependencies;
    return new RunPowerOperation({ railwayGateway: this.requireGateway(), sleep, databaseWaitSeconds });
  }

  private lockKey(environmentId: string): string {
    return `${INFRA_OPERATION_LOCK_KEY_PREFIX}${environmentId}`;
  }

  private lockTtlSeconds(): number {
    return this.dependencies.databaseWaitSeconds + INFRA_OPERATION_LOCK_GRACE_SECONDS;
  }

  /** `undefined` = nao mexe; `null` = limpa (desligar manual); `Date` = grava (ligar manual fora da janela). */
  private async resolveKeepOnUntilChange(params: {
    readonly params: PowerEnvironmentParams;
    readonly environmentId: string;
  }): Promise<Date | null | undefined> {
    const { direction, scheduleRepository } = this.dependencies;
    if (params.params.trigger !== INFRA_OPERATION_TRIGGER.MANUAL) return undefined;
    if (direction === INFRA_POWER_DIRECTION.OFF) return null;

    const schedule = await scheduleRepository.findByEnvironmentId(params.environmentId);
    if (!schedule?.isEnabled) return undefined;

    const now = this.dependencies.now();
    if (isInsideScheduleWindow({ schedule, at: now })) return undefined;

    const { keepOnUntil } = params.params;
    if (!keepOnUntil) throw new InfraKeepOnUntilRequiredError();
    if (keepOnUntil <= now) throw new InfraKeepOnUntilRequiredError('O horario para manter ligado deve estar no futuro');

    const limit = new Date(now.getTime() + INFRA_KEEP_ON_UNTIL_MAX_HOURS * MS_PER_HOUR);
    if (keepOnUntil > limit) {
      throw new InfraKeepOnUntilRequiredError(
        `O ambiente pode ficar ligado por no maximo ${INFRA_KEEP_ON_UNTIL_MAX_HOURS} horas`,
      );
    }
    return keepOnUntil;
  }

  // Cleanup de recurso: sem isto a trava ficaria presa ate o TTL por uma falha do banco.
  private async registerOperationReleasingLockOnFailure(params: {
    readonly params: PowerEnvironmentParams;
    readonly project: RailwayProject;
    readonly keepOnUntilChange: Date | null | undefined;
    readonly lockOwner: string;
  }): Promise<InfraOperationRecord> {
    const { params: powerParams, project, keepOnUntilChange, lockOwner } = params;
    try {
      if (keepOnUntilChange !== undefined) {
        await this.dependencies.scheduleRepository.setKeepOnUntil({
          environmentId: powerParams.environmentId,
          keepOnUntil: keepOnUntilChange,
        });
      }
      return await this.dependencies.operationRepository.create({
        railwayProjectId: project.id,
        railwayEnvironmentId: powerParams.environmentId,
        kind: this.operationKind(),
        trigger: powerParams.trigger,
        ...(powerParams.actor.agentId ? { actorAgentId: powerParams.actor.agentId } : {}),
      });
    } catch (error) {
      await this.releaseLock({ environmentId: powerParams.environmentId, lockOwner });
      throw error;
    }
  }

  private operationKind(): string {
    return this.dependencies.direction === INFRA_POWER_DIRECTION.OFF
      ? INFRA_OPERATION_KIND.POWER_OFF
      : INFRA_OPERATION_KIND.POWER_ON;
  }

  private async completeOperation(outcome: OutcomeParams): Promise<void> {
    await this.dependencies.operationRepository.finishOperation({
      id: outcome.params.operationId,
      status: outcome.status,
      serviceResults: outcome.serviceResults,
      finishedAt: new Date(),
    });
    await this.recordOutcome(outcome);
  }

  private async failOperation(params: { readonly params: RunOperationParams; readonly error: unknown }): Promise<void> {
    const { logger, operationRepository } = this.dependencies;
    logger.error('Operacao de infra falhou de forma inesperada', {
      operationId: params.params.operationId,
      environmentId: params.params.environmentId,
      errorCode: resolveServiceErrorCode(params.error),
    });

    try {
      await operationRepository.finishOperation({
        id: params.params.operationId,
        status: INFRA_OPERATION_STATUS.FAILED,
        serviceResults: [],
        finishedAt: new Date(),
      });
    } catch {
      logger.error('Nao foi possivel marcar a operacao de infra como falha', {
        operationId: params.params.operationId,
      });
    }
    await this.recordOutcome({ params: params.params, status: INFRA_OPERATION_STATUS.FAILED, serviceResults: [] });
  }

  /** Cache e auditoria depois do resultado gravado: se falharem, o log registra e o status nao muda. */
  private async recordOutcome(outcome: OutcomeParams): Promise<void> {
    const { params, status, serviceResults } = outcome;
    const { recordAudit, logger, direction } = this.dependencies;
    const counts = countServiceOutcomes(serviceResults);

    await this.invalidateInventory();
    try {
      await recordAudit.execute({
        actorType: params.actor.type,
        ...(params.actor.type === ACTOR_TYPE.AGENT && params.actor.agentId ? { actorId: params.actor.agentId } : {}),
        action:
          direction === INFRA_POWER_DIRECTION.OFF
            ? AUDIT_ACTION.INFRA_ENVIRONMENT_POWERED_OFF
            : AUDIT_ACTION.INFRA_ENVIRONMENT_POWERED_ON,
        targetType: AUDIT_TARGET.INFRA_ENVIRONMENT,
        targetId: params.environmentId,
        ...(params.ipAddress ? { ipAddress: params.ipAddress } : {}),
        metadata: {
          operationId: params.operationId,
          projectName: params.projectName,
          environmentName: params.environmentName,
          trigger: params.trigger,
          status,
          serviceResults,
          counts,
        },
      });
    } catch {
      logger.error('Nao foi possivel gravar a auditoria da operacao de infra', {
        operationId: params.operationId,
      });
    }

    logger.info('Operacao de infra concluida', {
      operationId: params.operationId,
      environmentId: params.environmentId,
      direction,
      status,
      ...counts,
    });
  }

  private async invalidateInventory(): Promise<void> {
    try {
      await this.dependencies.cache.delete(INFRA_INVENTORY_CACHE_KEY);
    } catch {
      this.dependencies.logger.error('Nao foi possivel invalidar o cache do inventario de infra', {});
    }
  }

  /** Renovar a trava e melhor esforco: falhar aqui nao pode reprovar um servico que ja foi ligado/desligado. */
  private async renewLock(params: LockParams): Promise<void> {
    const { environmentId, lockOwner } = params;
    try {
      const isOwner = await this.dependencies.cache.renewIfOwner({
        key: this.lockKey(environmentId),
        owner: lockOwner,
        ttlSeconds: this.lockTtlSeconds(),
      });
      if (!isOwner) this.logLockLost({ environmentId, action: 'renew' });
    } catch {
      this.dependencies.logger.error('Nao foi possivel renovar a trava da operacao de infra', { environmentId });
    }
  }

  private async releaseLock(params: LockParams): Promise<void> {
    const { environmentId, lockOwner } = params;
    try {
      const isOwner = await this.dependencies.cache.releaseIfOwner({
        key: this.lockKey(environmentId),
        owner: lockOwner,
      });
      if (!isOwner) this.logLockLost({ environmentId, action: 'release' });
    } catch {
      this.dependencies.logger.error('Nao foi possivel liberar a trava da operacao de infra', { environmentId });
    }
  }

  // A trava expirou (e talvez outra operacao a tenha): mexer nela derrubaria a protecao da outra.
  private logLockLost(params: { readonly environmentId: string; readonly action: 'renew' | 'release' }): void {
    this.dependencies.logger.info('Trava da operacao de infra nao pertence mais a esta operacao', params);
  }
}
