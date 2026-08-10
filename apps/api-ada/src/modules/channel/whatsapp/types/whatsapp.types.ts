/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { ChannelAdapterInterface } from '@adatechnology/meta-whatsapp-contracts';
import type { LogMessageUseCase } from '@adatechnology/meta-whatsapp-module';

import type { AdvanceConversationUseCase } from '@/modules/conversation/advanceConversation.use-case';
import type { RequestHandoffUseCase } from '@/modules/conversation/requestHandoff.use-case';

export type TranscribedWhatsAppChannelDependencies = {
  readonly channel: ChannelAdapterInterface;
  readonly logMessage: LogMessageUseCase;
  readonly companyId: string;
  readonly startState: string;
};

export type WhatsAppMessageHandlers = {
  readonly advanceConversation: AdvanceConversationUseCase;
  readonly requestHandoff: RequestHandoffUseCase;
  readonly channel: ChannelAdapterInterface;
};

export type CreateWhatsAppMessageHookParams = {
  /**
   * Lido a cada mensagem, e nao na criacao do hook.
   *
   * O hook e declarado dentro da chamada que constroi o modulo, e os use-cases dependem do que
   * essa mesma chamada devolve. Resolver na hora do uso desfaz o no sem inverter a ordem.
   */
  readonly resolveHandlers: () => WhatsAppMessageHandlers;
};
