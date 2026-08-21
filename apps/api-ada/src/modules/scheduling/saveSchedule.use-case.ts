/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { ACTOR_TYPE, AUDIT_ACTION, AUDIT_TARGET } from '@/modules/audit/audit.constant';
import type { RecordAuditLogUseCase } from '@/modules/audit/recordAuditLog.use-case';
import type {
  SaveScheduleParams,
  ScheduleSettings,
  SchedulingRepositoryInterface,
  WeeklyRule,
} from '@/modules/scheduling/types/scheduling.types';

export type SaveScheduleResult = {
  readonly settings: ScheduleSettings;
  readonly rules: readonly WeeklyRule[];
};

/**
 * Grava a configuracao da agenda e a grade semanal, e deixa trilha.
 *
 * Mudar horario de atendimento muda o que o bot promete ao cliente, e por isso e acao sensivel
 * (`security.md` §10). A trilha guarda quem, quando e de onde — nunca o conteudo de conversa.
 */
export class SaveScheduleUseCase {
  constructor(
    private readonly repository: SchedulingRepositoryInterface,
    private readonly auditLog: RecordAuditLogUseCase,
  ) {}

  async execute(params: SaveScheduleParams): Promise<SaveScheduleResult> {
    const settings = await this.repository.saveSettings(params.settings);
    await this.repository.replaceRules(params.rules);

    await this.auditLog.execute({
      actorType: ACTOR_TYPE.AGENT,
      actorId: params.agentId,
      action: AUDIT_ACTION.SCHEDULE_CHANGED,
      targetType: AUDIT_TARGET.SCHEDULE,
      ...(params.ipAddress ? { ipAddress: params.ipAddress } : {}),
      metadata: { isEnabled: settings.isEnabled, ruleCount: params.rules.length },
    });

    return { settings, rules: params.rules };
  }
}
