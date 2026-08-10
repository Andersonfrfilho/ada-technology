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
import type { BotMessages, SaveBotMessagesParams } from '@/modules/settings/types/settings.types';

type Dependencies = {
  readonly settings: SettingsRepository;
  readonly recordAuditLog: RecordAuditLogUseCase;
};

/**
 * Boas-vindas e despedida sao texto que o cliente le sem ninguem revisar na hora.
 *
 * Por isso a troca deixa trilha: se amanha o bot cumprimentar errado, a pergunta e quem escreveu e
 * quando, nao o que estava escrito. O texto em si fica no banco, nao na auditoria.
 */
export class SaveBotMessagesUseCase {
  constructor(private readonly dependencies: Dependencies) {}

  async execute({ companyId, messages, agentId, ipAddress }: SaveBotMessagesParams): Promise<BotMessages> {
    const saved = await this.dependencies.settings.save(companyId, {
      welcomeMessage: messages.welcomeMessage,
      farewellMessage: messages.farewellMessage,
    });

    await this.dependencies.recordAuditLog.execute({
      actorType: ACTOR_TYPE.AGENT,
      actorId: agentId,
      action: AUDIT_ACTION.SETTINGS_CHANGED,
      targetType: AUDIT_TARGET.SETTINGS,
      metadata: { scope: SETTINGS_SCOPE.BOT_MESSAGES },
      ...(ipAddress ? { ipAddress } : {}),
    });

    return { welcomeMessage: saved.welcomeMessage, farewellMessage: saved.farewellMessage };
  }
}
