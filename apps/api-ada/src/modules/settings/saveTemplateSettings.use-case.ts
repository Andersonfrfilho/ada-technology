/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { SettingsRepository } from '@adatechnology/meta-whatsapp-module';

import { ACTOR_TYPE, AUDIT_ACTION, AUDIT_TARGET } from '@/modules/audit/audit.constant';
import type { RecordAuditLogUseCase } from '@/modules/audit/recordAuditLog.use-case';
import { SETTINGS_SCOPE } from '@/modules/settings/settings.constant';
import type {
  SaveTemplateSettingsParams,
  TemplateSettings,
} from '@/modules/settings/types/settings.types';

type Dependencies = {
  readonly settings: SettingsRepository;
  readonly recordAuditLog: RecordAuditLogUseCase;
};

/**
 * Escolher o template de reengajamento decide o que a Meta manda fora da janela de 24h.
 *
 * O nome do template entra na trilha porque e identificador publico e aprovado por ela; as variaveis
 * ficam de fora, porque mapeiam campos do contexto da conversa e nao acrescentam nada a pergunta
 * "quem trocou o template".
 */
export class SaveTemplateSettingsUseCase {
  constructor(private readonly dependencies: Dependencies) {}

  async execute({
    companyId,
    settings,
    agentId,
    ipAddress,
  }: SaveTemplateSettingsParams): Promise<TemplateSettings> {
    const saved = await this.dependencies.settings.save(companyId, {
      templateName: settings.templateName,
      templateLanguage: settings.templateLanguage,
      templateVariables: [...settings.variables],
    });

    await this.dependencies.recordAuditLog.execute({
      actorType: ACTOR_TYPE.AGENT,
      actorId: agentId,
      action: AUDIT_ACTION.SETTINGS_CHANGED,
      targetType: AUDIT_TARGET.SETTINGS,
      metadata: { scope: SETTINGS_SCOPE.TEMPLATE, templateName: saved.templateName },
      ...(ipAddress ? { ipAddress } : {}),
    });

    return {
      templateName: saved.templateName,
      templateLanguage: saved.templateLanguage,
      variables: saved.templateVariables,
    };
  }
}
