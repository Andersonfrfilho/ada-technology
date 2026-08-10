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
  CreateWhatsAppTemplateParams,
  CreateWhatsAppTemplateResult,
} from '@/modules/settings/types/settings.types';
import type { TemplateCatalog } from '@/modules/settings/types/templateCatalog.interface';

type Dependencies = {
  readonly catalog: TemplateCatalog;
  readonly recordAuditLog: RecordAuditLogUseCase;
};

/**
 * Submeter template cria um registro permanente na conta da Meta em nome da empresa.
 *
 * E acao externa e irreversivel pelo painel — aprovada ou rejeitada, ela fica no historico da WABA.
 * A trilha guarda o nome submetido e o veredito inicial, que e o que se procura quando um template
 * inesperado aparece na lista semanas depois.
 */
export class CreateWhatsAppTemplateUseCase {
  constructor(private readonly dependencies: Dependencies) {}

  async execute({
    input,
    agentId,
    ipAddress,
  }: CreateWhatsAppTemplateParams): Promise<CreateWhatsAppTemplateResult> {
    const result = await this.dependencies.catalog.create(input);

    await this.dependencies.recordAuditLog.execute({
      actorType: ACTOR_TYPE.AGENT,
      actorId: agentId,
      action: AUDIT_ACTION.TEMPLATE_CREATED,
      targetType: AUDIT_TARGET.TEMPLATE,
      metadata: { shortId: result.shortId, templateName: input.name, status: result.status },
      ...(ipAddress ? { ipAddress } : {}),
    });

    return result;
  }
}
