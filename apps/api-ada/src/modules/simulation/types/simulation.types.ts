/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { ReceiveWebhookParams, ReceiveWebhookResult } from '@adatechnology/meta-whatsapp-module';

import type { PostWidgetAudioUseCase } from '@/modules/channel/widget/postWidgetAudio.use-case';
import type { PostWidgetMessageUseCase } from '@/modules/channel/widget/postWidgetMessage.use-case';
import type { WidgetAudioUpload } from '@/modules/channel/widget/types/widget.types';
import type { RecordAuditLogUseCase } from '@/modules/audit/recordAuditLog.use-case';
import type { ResolveConversationUseCase } from '@/modules/panel/resolveConversation.use-case';
import type { PanelChannel } from '@/modules/panel/panel.constant';
import type { SIMULATION_COMMAND_KIND, SimulationMediaKind } from '@/modules/simulation/simulation.constant';

export type SimulatedTextCommand = {
  readonly kind: typeof SIMULATION_COMMAND_KIND.TEXT;
  readonly text: string;
};

export type SimulatedReplyCommand = {
  readonly kind: typeof SIMULATION_COMMAND_KIND.REPLY;
  readonly option: { readonly id: string; readonly title: string };
};

export type SimulatedAudioCommand = {
  readonly kind: typeof SIMULATION_COMMAND_KIND.AUDIO;
  readonly audio: WidgetAudioUpload;
};

export type SimulatedInboundCommand = SimulatedTextCommand | SimulatedReplyCommand | SimulatedAudioCommand;

/**
 * Porta do injetor de WhatsApp, ausente quando o canal esta desligado no ambiente.
 *
 * `undefined` e a forma de dizer que a capacidade nao existe: sem segredo de app configurado nao ha
 * como assinar o webhook, e o painel nem desenha o botao.
 */
export type SimulatedInboundDeliverer = {
  deliver(params: DeliverSimulatedInboundParams): Promise<void>;
};

export type DeliverSimulatedInboundParams = {
  readonly from: string;
  readonly command: SimulatedInboundCommand;
};

export type WhatsAppWebhookReceiver = {
  execute(params: ReceiveWebhookParams): Promise<ReceiveWebhookResult>;
};

export type WhatsAppInboundSimulatorDependencies = {
  readonly receiveWebhook: WhatsAppWebhookReceiver;
  readonly companyId: string;
  readonly appSecret: string;
  readonly phoneNumberId: string;
  readonly businessAccountId: string;
};

export type SimulateInboundMessageDependencies = {
  readonly resolveConversation: ResolveConversationUseCase;
  readonly postWidgetMessage: PostWidgetMessageUseCase;
  readonly postWidgetAudio: PostWidgetAudioUseCase;
  readonly recordAudit: RecordAuditLogUseCase;
  readonly whatsapp?: SimulatedInboundDeliverer;
};

export type SimulateInboundMessageParams = {
  readonly conversationId: string;
  readonly command: SimulatedInboundCommand;
  readonly agentId: string;
  readonly ipAddress: string;
};

/** O que o painel precisa saber para desenhar o simulador sem tentar o que o ambiente nao faz. */
export type SimulationCapability = {
  readonly channel: PanelChannel;
  readonly acceptedMediaKinds: readonly SimulationMediaKind[];
};
