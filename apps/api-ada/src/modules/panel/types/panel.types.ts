/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type {
  LogMessageUseCase,
  ReleaseConversationUseCase as ModuleReleaseConversationUseCase,
  SendMessageUseCase,
  TakeoverConversationUseCase as ModuleTakeoverConversationUseCase,
} from '@adatechnology/meta-whatsapp-module';

import type { RecordAuditLogUseCase } from '@/modules/audit/recordAuditLog.use-case';
import type { PanelChannel } from '@/modules/panel/panel.constant';
import type { ResolveConversationUseCase } from '@/modules/panel/resolveConversation.use-case';
import type { TranscriptRepositoryInterface } from '@/modules/shared/transcript.types';

/**
 * A conversa vista de dentro: o id opaco que o painel usa, e a chave com que o modulo a guarda.
 *
 * A chave e o numero de telefone no WhatsApp e o id aleatorio no widget. Ela nao sai desta camada —
 * rota, log e trilha de auditoria falam so em `conversationId`.
 */
export type ConversationRef = {
  readonly conversationId: string;
  readonly conversationKey: string;
};

export type PanelConversationRepositoryInterface = {
  findById(params: FindConversationParams): Promise<ConversationRef | undefined>;
};

export type FindConversationParams = {
  readonly companyId: string;
  readonly conversationId: string;
};

export type ResolveConversationDependencies = {
  readonly conversations: PanelConversationRepositoryInterface;
  readonly companyId: string;
};

export type SendPanelMessageDependencies = {
  readonly resolveConversation: ResolveConversationUseCase;
  readonly sendWhatsAppMessage: SendMessageUseCase;
  readonly logMessage: LogMessageUseCase;
  readonly companyId: string;
  readonly startState: string;
};

export type SendPanelMessageParams = {
  readonly conversationId: string;
  readonly text: string;
  readonly agentId: string;
};

export type TakeoverConversationDependencies = {
  readonly resolveConversation: ResolveConversationUseCase;
  readonly takeover: ModuleTakeoverConversationUseCase;
  readonly recordAudit: RecordAuditLogUseCase;
  readonly companyId: string;
};

export type ReleaseConversationDependencies = {
  readonly resolveConversation: ResolveConversationUseCase;
  readonly release: ModuleReleaseConversationUseCase;
  readonly recordAudit: RecordAuditLogUseCase;
  readonly companyId: string;
};

export type AssignConversationParams = {
  readonly conversationId: string;
  readonly agentId: string;
  readonly ipAddress: string;
};

export type ExportConversationDependencies = {
  readonly resolveConversation: ResolveConversationUseCase;
  readonly messages: TranscriptRepositoryInterface;
  readonly recordAudit: RecordAuditLogUseCase;
  readonly companyId: string;
};


export type ExportConversationTranscriptParams = {
  readonly conversationId: string;
  readonly agentId: string;
  readonly ipAddress: string;
};

export type ExportConversationTranscriptResult = {
  readonly transcript: string;
  readonly filename: string;
};

/**
 * A conversa como o painel a ve.
 *
 * `contactHandle` e rotulo, nao endereco: o numero sai mascarado e o widget vira um nome generico.
 * Nada aqui serve para escrever ao cliente por fora — para isso existe o `id`, e a rota de envio.
 */
export type PanelConversation = {
  readonly id: string;
  readonly contactId: string;
  readonly channel: PanelChannel;
  readonly contactHandle: string;
  readonly clientName?: string;
  readonly lastContent?: string;
  readonly lastDirection?: string;
  readonly lastAt: string;
  readonly lastInboundAt: string | null;
  readonly mode: string;
  readonly assignedUserId: string | null;
  readonly waitingHuman: boolean;
  readonly unread: number;
  readonly currentState: string;
};

export type PanelInteractivePayload = {
  readonly type: string;
  readonly body?: { readonly text: string };
  readonly action: {
    readonly button?: string;
    readonly sections: readonly { readonly rows: readonly { id: string; title: string }[] }[];
  };
};

export type PanelMessage = {
  readonly id: string;
  readonly type: string;
  readonly direction: string;
  readonly sender: string;
  readonly timestamp: string;
  readonly content?: string;
  readonly status?: string;
  readonly readAt?: string;
  readonly payload?: PanelInteractivePayload;
  readonly moderation?: { readonly isOffensive: boolean; readonly terms: readonly string[] };
  readonly transcription?: {
    readonly status: string;
    readonly text?: string;
    readonly language?: string;
    readonly engine?: string;
  };
};

/** O que o bilhete guarda enquanto vive. Nunca sai para o navegador: o navegador tem so o bilhete. */
export type RealtimeTicketPayload = {
  readonly agentId: string;
  readonly conversationId?: string;
  readonly conversationKey?: string;
};

export type RealtimeTicketStoreInterface = {
  issue(payload: RealtimeTicketPayload): Promise<string>;
  redeem(ticket: string): Promise<RealtimeTicketPayload | undefined>;
};
