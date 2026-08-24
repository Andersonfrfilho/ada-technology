/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { NotificationModule } from '@adatechnology/notification-module';

import { PASSWORD_RESET_TEMPLATE } from '@/modules/notification/passwordResetTemplate.constant';

const TEMPLATES = [PASSWORD_RESET_TEMPLATE];

/**
 * Semeia no banco os templates que este produto envia, e so os que faltam.
 *
 * Existe pelo mesmo motivo que o provisionamento da agenda: com a tabela vazia, o `sendNotification`
 * nao acha template, a entrega nasce `skipped` com `template_not_found`, e a redefinicao de senha
 * cai no envio direto de emergencia — que funciona, mas com o texto fixo do fallback, nao com o que
 * alguem escreveu no painel.
 *
 * **Nunca sobrescreve.** `seedDefaultTemplates` e upsert, e upsert aqui apagaria a copy que o time
 * editou pelo painel na primeira reinicializacao da API. A comparacao e por
 * (chave, canal, locale) — a identidade do template —, entao notificacao nova nasce semeada sem
 * tocar no que ja existe.
 */
export class SeedNotificationTemplatesUseCase {
  constructor(
    private readonly notification: NotificationModule,
    private readonly companyId: string,
  ) {}

  async execute(): Promise<number> {
    const existing = await this.notification.useCases.listTemplates.execute({ companyId: this.companyId });
    const existingIdentities = new Set(
      existing.map((template) => `${template.key}|${template.channel}|${template.locale}`),
    );

    const missing = TEMPLATES.filter(
      (template) => !existingIdentities.has(`${template.key}|${template.channel}|${template.locale}`),
    );
    if (missing.length === 0) return 0;

    await this.notification.useCases.seedDefaultTemplates.execute({
      companyId: this.companyId,
      templates: missing,
    });

    return missing.length;
  }
}
