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
import type { ConversationOutcome } from '@/modules/conversation/conversation.constant';

export type WidgetChannelAdapterDependencies = {
  readonly logMessage: LogMessageUseCase;
  readonly companyId: string;
  readonly startState: string;
};

export type StartWidgetSessionDependencies = {
  readonly advanceConversation: AdvanceConversationUseCase;
  readonly channel: ChannelAdapterInterface;
};

export type PostWidgetMessageDependencies = StartWidgetSessionDependencies & {
  readonly logMessage: LogMessageUseCase;
  readonly companyId: string;
  readonly startState: string;
};

export type StartWidgetSessionResult = {
  readonly sessionId: string;
};

export type PostWidgetMessageParams = {
  readonly sessionId: string;
  readonly text: string;
};

export type PostWidgetMessageResult = {
  readonly outcome: ConversationOutcome;
};
