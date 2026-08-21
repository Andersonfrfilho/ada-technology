/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type {
  ChannelAdapterInterface,
  ConversationSession,
  FlowActionHandler,
  FlowActionKind,
  FlowNodeData,
} from '@adatechnology/meta-whatsapp-contracts';
import { describe, expect, test } from 'bun:test';

import type { AgentProfile, AgentRepositoryInterface } from '@/modules/agent/types/agent.types';
import { BookAppointmentUseCase } from '@/modules/scheduling/bookAppointment.use-case';
import { ListAvailableSlotsUseCase } from '@/modules/scheduling/listAvailableSlots.use-case';
import { ListSchedulableAgentsUseCase } from '@/modules/scheduling/listSchedulableAgents.use-case';
import { registerSchedulingFlowActions } from '@/modules/scheduling/registerSchedulingFlowActions';
import {
  APPOINTMENT_STATUS,
  SCHEDULING_CONTEXT_KEY,
  SCHEDULING_FLOW_ACTION_KIND,
  SCHEDULING_FLOW_MESSAGE,
  SCHEDULING_FLOW_PARAM,
} from '@/modules/scheduling/scheduling.constant';
import type {
  Appointment,
  BookAppointmentParams,
  ScheduleSettings,
  SchedulingRepositoryInterface,
  WeeklyRule,
} from '@/modules/scheduling/types/scheduling.types';

const ANA = 'a0000000-0000-4000-8000-000000000001';
const BRUNO = 'a0000000-0000-4000-8000-000000000002';
const SESSION = 'b0000000-0000-4000-8000-000000000009';

const HANDOFF_NODE = 'acao_handoff';
const AGENTS_NODE = 'acao_agenda_pessoas';
const SLOTS_NODE = 'acao_agenda_horarios';

/** Sexta-feira, 8h em Sao Paulo. A agenda da Ana e das 9h as 12h; Bruno nao tem faixa. */
const NOW = new Date('2026-08-21T11:00:00Z');
const FIRST_SLOT = '2026-08-21T12:00:00.000Z';

const SETTINGS: ScheduleSettings = {
  timezone: 'America/Sao_Paulo',
  slotMinutes: 60,
  minimumNoticeMinutes: 0,
  horizonDays: 1,
  isEnabled: true,
};

const RULES: readonly WeeklyRule[] = [
  { agentId: ANA, weekday: 5, startMinute: 9 * 60, endMinute: 12 * 60 },
];

const PROFILES: readonly AgentProfile[] = [
  { id: ANA, email: 'ana@ada.test', name: 'Ana', role: 'agent' },
  { id: BRUNO, email: 'bruno@ada.test', name: 'Bruno', role: 'agent' },
] as readonly AgentProfile[];

type SentList = { readonly body: string; readonly rows: readonly { id: string; title: string }[] };

/** Canal de mentira: guarda o que seria enviado, que e a unica saida observavel destas acoes. */
function fakeChannel() {
  const texts: string[] = [];
  const lists: SentList[] = [];

  const channel = {
    sendText: async (_to: string, body: string) => {
      texts.push(body);

      return { externalMessageId: null };
    },
    sendInteractiveList: async (params: SentList & { to: string; buttonLabel: string }) => {
      lists.push({ body: params.body, rows: params.rows });

      return { externalMessageId: null };
    },
  } as unknown as ChannelAdapterInterface;

  return { channel, texts, lists };
}

function fakeRepository(overrides: Partial<{ settings: ScheduleSettings; rules: readonly WeeklyRule[] }> = {}) {
  const stored: Appointment[] = [];
  const taken = new Set<string>();

  const repository: SchedulingRepositoryInterface = {
    getSettings: async () => overrides.settings ?? SETTINGS,
    saveSettings: async (settings) => settings,
    listRules: async () => overrides.rules ?? RULES,
    replaceRules: async () => undefined,
    listBusy: async () => [],
    book: async (params: BookAppointmentParams & { readonly endsAt: Date }) => {
      const key = `${params.agentIds.join(',')}@${params.startsAt.toISOString()}`;
      if (taken.has(key)) return undefined;
      taken.add(key);

      const appointment: Appointment = {
        id: `appointment-${stored.length + 1}`,
        sessionId: params.sessionId,
        startsAt: params.startsAt,
        endsAt: params.endsAt,
        status: APPOINTMENT_STATUS.SCHEDULED,
        sourceChannel: params.sourceChannel,
        agentIds: params.agentIds,
      };
      stored.push(appointment);

      return appointment;
    },
    findBySessionAndStart: async ({ sessionId, startsAt }) =>
      stored.find(
        (item) => item.sessionId === sessionId && item.startsAt.getTime() === startsAt.getTime(),
      ),
    findById: async (appointmentId) => stored.find((item) => item.id === appointmentId),
    cancel: async () => undefined,
    list: async () => stored,
  };

  return { repository, stored, taken };
}

function handlersOf(repository: SchedulingRepositoryInterface): Map<FlowActionKind, FlowActionHandler> {
  const handlers = new Map<FlowActionKind, FlowActionHandler>();
  const agents = {
    listActive: async () => PROFILES,
  } as unknown as AgentRepositoryInterface;
  const listAvailableSlots = new ListAvailableSlotsUseCase(repository, () => NOW);

  registerSchedulingFlowActions({
    registry: { registerFlowAction: (kind, handler) => handlers.set(kind, handler) },
    repository,
    listSchedulableAgents: new ListSchedulableAgentsUseCase(agents, repository),
    listAvailableSlots,
    bookAppointment: new BookAppointmentUseCase(repository, listAvailableSlots, () => NOW),
  });

  return handlers;
}

const SESSION_DATA = { id: SESSION, whatsappNumber: '5511999999999' } as ConversationSession;

function nodeOf(actionKind: string, actionParams: Record<string, unknown> = {}): FlowNodeData {
  return { id: `no_${actionKind}`, type: 'action', actionKind, actionParams };
}

async function run(params: {
  readonly repository: SchedulingRepositoryInterface;
  readonly kind: FlowActionKind;
  readonly channel: ChannelAdapterInterface;
  readonly context?: Record<string, unknown>;
  readonly actionParams?: Record<string, unknown>;
}) {
  const handler = handlersOf(params.repository).get(params.kind);
  if (!handler) throw new Error(`acao nao registrada: ${params.kind}`);

  return handler({
    node: nodeOf(params.kind, params.actionParams ?? {}),
    session: SESSION_DATA,
    channel: params.channel,
    context: params.context ?? {},
  });
}

describe('list_schedule_agents', () => {
  test('oferece so quem tem faixa cadastrada e guarda o que ofereceu', async () => {
    const { repository } = fakeRepository();
    const { channel, lists } = fakeChannel();

    const result = await run({ repository, kind: SCHEDULING_FLOW_ACTION_KIND.LIST_AGENTS, channel });

    expect(lists[0]?.rows).toEqual([{ id: ANA, title: 'Ana' }]);
    expect(result?.context?.[SCHEDULING_CONTEXT_KEY.AGENT_OPTIONS]).toEqual([ANA]);
    expect(result?.next).toBeUndefined();
  });

  test('agenda desligada chama uma pessoa em vez de listar', async () => {
    const { repository } = fakeRepository({ settings: { ...SETTINGS, isEnabled: false } });
    const { channel, texts, lists } = fakeChannel();

    const result = await run({
      repository,
      kind: SCHEDULING_FLOW_ACTION_KIND.LIST_AGENTS,
      channel,
      actionParams: { [SCHEDULING_FLOW_PARAM.UNAVAILABLE_NEXT]: HANDOFF_NODE },
    });

    expect(lists).toHaveLength(0);
    expect(texts).toEqual([SCHEDULING_FLOW_MESSAGE.NO_AGENTS]);
    expect(result?.next).toBe(HANDOFF_NODE);
  });
});

describe('list_available_slots', () => {
  const offered = { [SCHEDULING_CONTEXT_KEY.AGENT_OPTIONS]: [ANA] };

  test('lista os horarios da pessoa escolhida', async () => {
    const { repository } = fakeRepository();
    const { channel, lists } = fakeChannel();

    const result = await run({
      repository,
      kind: SCHEDULING_FLOW_ACTION_KIND.LIST_SLOTS,
      channel,
      context: { ...offered, [SCHEDULING_CONTEXT_KEY.AGENT_ID]: ANA },
    });

    expect(lists[0]?.rows.map((row) => row.id)).toEqual([
      FIRST_SLOT,
      '2026-08-21T13:00:00.000Z',
      '2026-08-21T14:00:00.000Z',
    ]);
    expect(result?.context?.[SCHEDULING_CONTEXT_KEY.SLOT_OPTIONS]).toHaveLength(3);
  });

  /** Quem digita responde "1", e a posicao vale tanto quanto o id da linha tocada. */
  test('aceita a posicao na lista como escolha', async () => {
    const { repository } = fakeRepository();
    const { channel } = fakeChannel();

    const result = await run({
      repository,
      kind: SCHEDULING_FLOW_ACTION_KIND.LIST_SLOTS,
      channel,
      context: { ...offered, [SCHEDULING_CONTEXT_KEY.AGENT_ID]: '1' },
    });

    expect(result?.context?.[SCHEDULING_CONTEXT_KEY.AGENT_ID]).toBe(ANA);
  });

  /** Id que nunca foi oferecido nao vira consulta a agenda de outra pessoa. */
  test('recusa escolha que nao estava na lista', async () => {
    const { repository } = fakeRepository();
    const { channel, texts } = fakeChannel();

    const result = await run({
      repository,
      kind: SCHEDULING_FLOW_ACTION_KIND.LIST_SLOTS,
      channel,
      context: { ...offered, [SCHEDULING_CONTEXT_KEY.AGENT_ID]: BRUNO },
      actionParams: { [SCHEDULING_FLOW_PARAM.RETRY_NEXT]: AGENTS_NODE },
    });

    expect(texts).toEqual([SCHEDULING_FLOW_MESSAGE.NOT_UNDERSTOOD]);
    expect(result?.next).toBe(AGENTS_NODE);
  });

  test('sem horario livre a conversa vai para uma pessoa', async () => {
    const { repository } = fakeRepository({ rules: [] });
    const { channel, texts } = fakeChannel();

    const result = await run({
      repository,
      kind: SCHEDULING_FLOW_ACTION_KIND.LIST_SLOTS,
      channel,
      context: { ...offered, [SCHEDULING_CONTEXT_KEY.AGENT_ID]: ANA },
      actionParams: { [SCHEDULING_FLOW_PARAM.UNAVAILABLE_NEXT]: HANDOFF_NODE },
    });

    expect(texts).toEqual([SCHEDULING_FLOW_MESSAGE.NO_SLOTS]);
    expect(result?.next).toBe(HANDOFF_NODE);
  });
});

describe('book_appointment', () => {
  const chosen = {
    [SCHEDULING_CONTEXT_KEY.AGENT_ID]: ANA,
    [SCHEDULING_CONTEXT_KEY.SLOT_OPTIONS]: [FIRST_SLOT],
    [SCHEDULING_CONTEXT_KEY.SLOT]: FIRST_SLOT,
  };

  test('reserva o horario escolhido e confirma', async () => {
    const { repository, stored } = fakeRepository();
    const { channel, texts } = fakeChannel();

    const result = await run({
      repository,
      kind: SCHEDULING_FLOW_ACTION_KIND.BOOK,
      channel,
      context: chosen,
    });

    expect(stored).toHaveLength(1);
    expect(stored[0]?.sessionId).toBe(SESSION);
    expect(texts[0]).toContain(SCHEDULING_FLOW_MESSAGE.BOOKED);
    // Sem `next`: reservado, a conversa termina no proprio no.
    expect(result?.next).toBeUndefined();
  });

  test('horario tomado no meio do caminho volta para a lista', async () => {
    const { repository, taken } = fakeRepository();
    taken.add(`${ANA}@${FIRST_SLOT}`);
    const { channel, texts } = fakeChannel();

    const result = await run({
      repository,
      kind: SCHEDULING_FLOW_ACTION_KIND.BOOK,
      channel,
      context: chosen,
      actionParams: { [SCHEDULING_FLOW_PARAM.RETRY_NEXT]: SLOTS_NODE },
    });

    expect(texts).toEqual([SCHEDULING_FLOW_MESSAGE.TAKEN]);
    expect(result?.next).toBe(SLOTS_NODE);
  });

  /** Instante que ninguem ofereceu nao vira reserva, mesmo sendo um horario valido da agenda. */
  test('recusa horario que nao estava na lista oferecida', async () => {
    const { repository, stored } = fakeRepository();
    const { channel, texts } = fakeChannel();

    const result = await run({
      repository,
      kind: SCHEDULING_FLOW_ACTION_KIND.BOOK,
      channel,
      context: { ...chosen, [SCHEDULING_CONTEXT_KEY.SLOT]: '2026-08-21T13:00:00.000Z' },
      actionParams: { [SCHEDULING_FLOW_PARAM.RETRY_NEXT]: SLOTS_NODE },
    });

    expect(stored).toHaveLength(0);
    expect(texts).toEqual([SCHEDULING_FLOW_MESSAGE.NOT_UNDERSTOOD]);
    expect(result?.next).toBe(SLOTS_NODE);
  });
});
