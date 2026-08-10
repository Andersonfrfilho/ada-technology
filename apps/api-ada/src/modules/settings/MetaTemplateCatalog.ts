/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { WhatsAppTemplateProvider } from '@adatechnology/meta-whatsapp-provider';

import {
  WhatsAppNotConfiguredError,
  WhatsAppTemplateRequestFailedError,
} from '@/modules/settings/settings.error';
import type { CreateTemplateInput, CreateWhatsAppTemplateResult } from '@/modules/settings/types/settings.types';
import type { TemplateCatalog, TemplateSummary } from '@/modules/settings/types/templateCatalog.interface';
import { logger } from '@/shared/logger';

const SOURCE = 'MetaTemplateCatalog';
const LIST_OPERATION = 'list';
const CREATE_OPERATION = 'create';

type Dependencies = {
  /** Ausente quando o canal esta desligado: sem WABA nao existe catalogo, e a rota falha fechada. */
  readonly provider?: WhatsAppTemplateProvider;
};

/**
 * A borda entre a Graph API e o dominio.
 *
 * E aqui que a falha de rede vira erro tipado — o use-case e o controller nao capturam nada. O
 * `catch` existe pelo motivo permitido: converter erro de sistema externo, e nao para logar e
 * relancar. O detalhe da Meta fica no log do servidor e nunca na resposta.
 */
export class MetaTemplateCatalog implements TemplateCatalog {
  constructor(private readonly dependencies: Dependencies) {}

  async list(): Promise<readonly TemplateSummary[]> {
    const provider = this.requireProvider();

    try {
      return await provider.listTemplates();
    } catch (error) {
      logger.error({ message: 'Falha ao listar templates', source: SOURCE, meta: describe(error) });
      throw new WhatsAppTemplateRequestFailedError(LIST_OPERATION);
    }
  }

  async create(input: CreateTemplateInput): Promise<CreateWhatsAppTemplateResult> {
    const provider = this.requireProvider();

    try {
      const result = await provider.createTemplate({
        name: input.name,
        category: input.category,
        language: input.language,
        headerType: input.headerType,
        bodyText: input.bodyText,
        ...(input.headerText ? { headerText: input.headerText } : {}),
        ...(input.footerText ? { footerText: input.footerText } : {}),
      });

      return { shortId: result.shortId, status: result.status };
    } catch (error) {
      logger.error({ message: 'Falha ao criar template', source: SOURCE, meta: describe(error) });
      throw new WhatsAppTemplateRequestFailedError(CREATE_OPERATION);
    }
  }

  private requireProvider(): WhatsAppTemplateProvider {
    if (!this.dependencies.provider) throw new WhatsAppNotConfiguredError();

    return this.dependencies.provider;
  }
}

/** Mensagem da Meta serve para diagnostico; o corpo cru dela nao entra no log. */
function describe(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { errorName: typeof error };

  return { errorName: error.name, errorMessage: error.message };
}
