/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { FLOW_ACTION_KIND } from '@adatechnology/meta-whatsapp-contracts';
import type { ChannelAdapterInterface, FlowGraphData } from '@adatechnology/meta-whatsapp-contracts';
import type { GetFlowGraphUseCase, SessionRepository, SessionRow } from '@adatechnology/meta-whatsapp-module';

export const COMPANY_ID = '00000000-0000-4000-8000-000000000001';
export const WHATSAPP_NUMBER = '5511999990000';

export const ATENDIMENTO_GRAPH: FlowGraphData = {
  key: 'atendimento',
  label: 'Atendimento',
  startNodeId: 'menu',
  version: 1,
  nodes: {
    menu: {
      id: 'menu',
      type: 'menu',
      question: 'Como posso ajudar?',
      options: [
        ['produtos', 'Conhecer produtos'],
        ['humano', 'Falar com alguem'],
      ],
      next: { byAnswer: { produtos: 'produto', humano: 'entregar' }, default: 'entregar' },
    },
    produto: {
      id: 'produto',
      type: 'question',
      questionType: 'text',
      contextKey: 'produto',
      question: 'Qual produto te interessa?',
    },
    entregar: { id: 'entregar', type: 'action', actionKind: FLOW_ACTION_KIND.HANDOFF },
  },
};

export type SentMessage = { readonly kind: 'text' | 'list'; readonly body: string };

export class FakeChannel implements ChannelAdapterInterface {
  readonly sent: SentMessage[] = [];

  async sendText(_to: string, body: string): Promise<{ externalMessageId: string | null }> {
    this.sent.push({ kind: 'text', body });
    return { externalMessageId: null };
  }

  async sendInteractiveList(params: { body: string }): Promise<{ externalMessageId: string | null }> {
    this.sent.push({ kind: 'list', body: params.body });
    return { externalMessageId: null };
  }

  async sendMedia(): Promise<{ externalMessageId: string | null }> {
    return { externalMessageId: null };
  }

  async sendTemplate(): Promise<{ externalMessageId: string | null }> {
    return { externalMessageId: null };
  }

  async fetchMediaAsBase64(): Promise<{ data: string; mimeType: string }> {
    return { data: '', mimeType: 'application/octet-stream' };
  }
}

function buildRow(): SessionRow {
  const now = new Date();

  return {
    id: '00000000-0000-4000-8000-0000000000ff',
    companyId: COMPANY_ID,
    whatsappNumber: WHATSAPP_NUMBER,
    currentState: 'start',
    flowKey: null,
    currentNodeId: null,
    context: {},
    mode: 'bot',
    assignedUserId: null,
    humanRequestedAt: null,
    lastInboundAt: null,
    lastAgentReadAt: null,
    lastActivity: now,
    createdAt: now,
    updatedAt: now,
  };
}

/** Guarda uma unica sessao em memoria: o motor so toca a do numero que enviou a mensagem. */
export class FakeSessionRepository {
  row: SessionRow = buildRow();

  async getOrCreate(): Promise<SessionRow> {
    return this.row;
  }

  async getContext(): Promise<SessionRow | undefined> {
    return this.row;
  }

  async setFlowPosition(_companyId: string, _number: string, flowKey: string | null, currentNodeId: string | null): Promise<void> {
    this.row = { ...this.row, flowKey, currentNodeId };
  }

  async patchContext(_companyId: string, _number: string, patch: Record<string, unknown>): Promise<void> {
    this.row = { ...this.row, context: { ...this.row.context, ...patch } };
  }

  async setMode(_companyId: string, _number: string, mode: string): Promise<void> {
    this.row = { ...this.row, mode };
  }

  async requestHuman(): Promise<void> {
    this.row = { ...this.row, humanRequestedAt: new Date() };
  }
}

export function asSessionRepository(fake: FakeSessionRepository): SessionRepository {
  return fake as unknown as SessionRepository;
}

/** Um `GetFlowGraphUseCase` de verdade exige repositorio e cache; o motor so chama `execute`. */
export function fakeGetFlowGraph(graphs: Record<string, FlowGraphData>): GetFlowGraphUseCase {
  return {
    execute: async ({ key }: { key: string }): Promise<FlowGraphData | undefined> => graphs[key],
  } as unknown as GetFlowGraphUseCase;
}
