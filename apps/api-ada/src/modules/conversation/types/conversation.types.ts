/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type {
  ChannelAdapterInterface,
  FlowActionRegistry,
  FlowGraphData,
  FlowNodeData,
} from '@adatechnology/meta-whatsapp-contracts';
import type {
  FlowInterpreter,
  FlowRunResult,
  GetFlowGraphUseCase,
  SessionRepository,
  SessionRow,
} from '@adatechnology/meta-whatsapp-module';

import type { ConversationOutcome } from '@/modules/conversation/conversation.constant';
import type { RequestHandoffUseCase } from '@/modules/conversation/requestHandoff.use-case';
import type { HandoffReason } from '@/shared/constants/domain.constant';

export type ValidateFlowAnswerParams = {
  readonly node: FlowNodeData;
  readonly text: string;
};

export type FlowAnswerValidation =
  | { readonly isValid: true; readonly answer: string }
  | { readonly isValid: false };

export type PresentFlowNodeParams = {
  readonly node: FlowNodeData;
  readonly to: string;
  readonly channel: ChannelAdapterInterface;
  /** Reapresentacao apos resposta invalida: a mensagem de abertura do no nao se repete. */
  readonly isRepeat?: boolean;
};

export type RequestHandoffDependencies = {
  readonly sessions: SessionRepository;
  readonly companyId: string;
};

export type RequestHandoffParams = {
  readonly whatsappNumber: string;
  readonly channel: ChannelAdapterInterface;
  readonly reason: HandoffReason;
};

export type AdvanceConversationDependencies = {
  readonly sessions: SessionRepository;
  readonly getFlowGraph: GetFlowGraphUseCase;
  readonly interpreter: FlowInterpreter;
  readonly requestHandoff: RequestHandoffUseCase;
  readonly companyId: string;
  readonly startState: string;
};

export type AdvanceConversationParams = {
  readonly whatsappNumber: string;
  readonly text: string;
  readonly channel: ChannelAdapterInterface;
};

export type AdvanceConversationResult = {
  readonly outcome: ConversationOutcome;
};

export type ConversationStepParams = {
  readonly params: AdvanceConversationParams;
  readonly session: SessionRow;
  readonly graph: FlowGraphData;
};

export type AnswerNodeParams = ConversationStepParams & {
  readonly node: FlowNodeData;
  readonly nodeId: string;
};

export type RunFlowParams = ConversationStepParams & {
  readonly nodeId: string;
  readonly context: Record<string, unknown>;
  readonly userAnswer?: string;
};

export type HandOffFromConversationParams = {
  readonly params: AdvanceConversationParams;
  readonly reason: HandoffReason;
};

export type SettleFlowParams = {
  readonly params: AdvanceConversationParams;
  readonly graph: FlowGraphData;
  readonly result: Exclude<FlowRunResult, { kind: 'cross-flow' }>;
};

export type RegisterConversationFlowActionsParams = {
  readonly registry: FlowActionRegistry;
  readonly requestHandoff: RequestHandoffUseCase;
};
