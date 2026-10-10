/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { RecordAuditLogUseCase } from '@/modules/audit/recordAuditLog.use-case';
import type { InfraPowerDirection } from '@/modules/infra/infra.constant';
import { InfraNotConfiguredError, InfraOperationInProgressError } from '@/modules/infra/infra.error';
import { buildRunOperationParams } from '@/modules/infra/buildRunOperationParams';
import { InfraOperationLock } from '@/modules/infra/InfraOperationLock';
import { locateManagedEnvironment } from '@/modules/infra/locateManagedEnvironment';
import {
  buildPowerDeniedEntry,
  buildPowerRequestedEntry,
  resolveDenialReason,
} from '@/modules/infra/powerAuditEntries';
import { PowerOutcomeRecorder } from '@/modules/infra/powerOutcomeRecorder';
import { recordInfraAudit } from '@/modules/infra/recordInfraAudit';
import { registerPowerOperation } from '@/modules/infra/registerPowerOperation';
import { resolveKeepOnUntil } from '@/modules/infra/resolveKeepOnUntil';
import { resolveOperationStatus } from '@/modules/infra/resolveOperationStatus';
import { resolveServiceErrorCode } from '@/modules/infra/resolveServiceErrorCode';
import { RunPowerOperation } from '@/modules/infra/runPowerOperation';
import type { InfraCacheInterface } from '@/modules/infra/types/infraCache.interface';
import type {
  InfraOperationRecord,
  PowerEnvironmentParams,
  PowerEnvironmentResult,
  RunOperationParams,
} from '@/modules/infra/types/infraOperation.types';
import type { InfraOperationRepositoryInterface } from '@/modules/infra/types/infraOperationRepository.interface';
import type { InfraLogger, InfraSleep } from '@/modules/infra/types/infraRuntime.types';
import type { InfraScheduleRepositoryInterface } from '@/modules/infra/types/infraScheduleRepository.interface';
import type { RailwayGatewayInterface } from '@/modules/infra/types/railwayGateway.interface';
import type { ResolveGateway } from '@/modules/infra/types/resolveGateway.types';
import type {
  Admission,
  AdmitParams,
  DispatchParams,
  RegisterParams,
} from '@/modules/infra/types/powerAdmission.types';

export type PowerEnvironmentDependencies = {
  readonly resolveGateway: ResolveGateway;
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

/**
 * Liga ou desliga um ambiente. O `execute` valida, trava e cria a operacao; o trabalho de verdade roda
 * em segundo plano em `runOperation`, para a rota responder 202 antes de o Railway terminar.
 *
 * Ambiente `unmanaged` e recusado com o mesmo erro do protegido: o que nao e gerenciavel pelo painel
 * nao ganha botao de ligar/desligar, e a resposta 403 e a mesma.
 */
export class PowerEnvironmentUseCase {
  private readonly lock: InfraOperationLock;
  private readonly outcomeRecorder: PowerOutcomeRecorder;

  constructor(private readonly dependencies: Dependencies) {
    this.lock = new InfraOperationLock(dependencies);
    this.outcomeRecorder = new PowerOutcomeRecorder(dependencies);
  }

  async execute(params: PowerEnvironmentParams): Promise<PowerEnvironmentResult> {
    const railwayGateway = await this.requireGateway();
    const admission = await this.admitOrAuditDenial({ params, railwayGateway });
    const operation = await this.registerOperation({ params, ...admission });
    await this.outcomeRecorder.invalidateInventory();
    await this.dispatch({ params, admission, operation, gateway: railwayGateway });

    return { operationId: operation.id };
  }

  /** Nunca rejeita: qualquer falha marca a operacao como `failed`, e a trava e sempre liberada. */
  async runOperation(params: RunOperationParams): Promise<void> {
    try {
      const serviceResults = await this.buildRunner(params.gateway).execute({
        direction: this.dependencies.direction,
        environmentId: params.environmentId,
        services: params.services,
        onProgress: () => this.lock.renew(params),
      });
      await this.outcomeRecorder.complete({ params, status: resolveOperationStatus({ serviceResults }), serviceResults });
    } catch (error) {
      await this.outcomeRecorder.fail({ params, error });
    } finally {
      await this.lock.release(params);
    }
  }

  private async dispatch(options: DispatchParams): Promise<void> {
    const { params, admission, operation, gateway } = options;
    const { project, environment, lockOwner } = admission;
    const { direction, logger, recordAudit } = this.dependencies;
    await recordInfraAudit({
      recordAudit,
      logger,
      entry: buildPowerRequestedEntry({
        params,
        direction,
        operationId: operation.id,
        projectName: project.name,
        environmentName: environment.name,
      }),
    });

    const runParams = buildRunOperationParams({ operationId: operation.id, params, project, environment, lockOwner, gateway });
    void this.runOperation(runParams).catch((error: unknown) => {
      logger.error('Falha inesperada no runner de infra', {
        operationId: operation.id,
        direction,
        errorCode: resolveServiceErrorCode(error),
      });
    });
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
    const { managedPattern, selfEnvironmentId, direction, scheduleRepository, now } = this.dependencies;
    const { project, environment } = await locateManagedEnvironment({
      railwayGateway: params.railwayGateway,
      environmentId: params.params.environmentId,
      managedPattern,
      selfEnvironmentId,
    });
    // Antes da trava e de qualquer operacao: um keepOnUntil recusado nao pode deixar rastro.
    const keepOnUntilChange = await resolveKeepOnUntil({
      params: params.params,
      environmentId: environment.id,
      direction,
      scheduleRepository,
      now,
    });

    const lockOwner = await this.lock.acquire(environment.id);
    if (!lockOwner) throw new InfraOperationInProgressError();

    return { project, environment, keepOnUntilChange, lockOwner };
  }

  private async requireGateway(): Promise<RailwayGatewayInterface> {
    const railwayGateway = await this.dependencies.resolveGateway();
    if (!railwayGateway) throw new InfraNotConfiguredError();
    return railwayGateway;
  }

  private buildRunner(railwayGateway: RailwayGatewayInterface): RunPowerOperation {
    const { sleep, databaseWaitSeconds } = this.dependencies;
    return new RunPowerOperation({ railwayGateway, sleep, databaseWaitSeconds });
  }

  private registerOperation(options: RegisterParams): Promise<InfraOperationRecord> {
    const { direction, scheduleRepository, operationRepository } = this.dependencies;
    return registerPowerOperation({ ...options, direction, lock: this.lock, scheduleRepository, operationRepository });
  }
}
