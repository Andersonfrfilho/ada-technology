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
import { SlotUnavailableError, type Booking } from '@adatechnology/scheduling-contracts';
import { describe, expect, test } from 'bun:test';

import { registerSchedulingFlowActions } from '@/modules/scheduling/registerSchedulingFlowActions';
import type { SchedulingAgenda } from '@/modules/scheduling/SchedulingAgenda';
import {
  SCHEDULING_CONTEXT_KEY,
  SCHEDULING_FLOW_ACTION_KIND,
  SCHEDULING_FLOW_MESSAGE,
  SCHEDULING_FLOW_PARAM,
  SCHEDULING_RESOURCE_TIMEZONE,
} from '@/modules/scheduling/scheduling.constant';
import type { AgendaAttendant, BookAgendaParams } from '@/modules/scheduling/types/scheduling.types';

const ANA = 'a0000000-0000-4000-8000-000000000001';
const BRUNO = 'a0000000-0000-4000-8000-000000000002';
const SESSION = 'b0000000-0000-4000-8000-000000000009';

const HANDOFF_NODE = 'acao_handoff';
const AGENTS_NODE = 'acao_agenda_pessoas';
const SLOTS_NODE = 'acao_agenda_horarios';

/** Sexta-feira. Os tres horarios sao os que a agenda da Ana ofereceria das 9h as 12h. */
const FIRST_SLOT = '2026-08-21T12:00:00.000Z';
const SLOTS = [FIRST_SLOT, '2026-08-21T13:00:00.000Z', '2026-08-21T14:00:00.000Z'] as const;

const ATTENDANTS: readonly AgendaAttendant[] = [
  { id: ANA, name: 'Ana', timezone: SCHEDULING_RESOURCE_TIMEZONE },
];

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

type AgendaOverrides = {
  readonly attendants?: readonly AgendaAttendant[];
  readonly slots?: readonly string[];
  readonly taken?: readonly string[];
};

function fakeAgenda(overrides: AgendaOverrides = {}) {
  const booked: BookAgendaParams[] = [];
  const taken = new Set(overrides.taken ?? []);

  const agenda = {
    listAttendants: async () => overrides.attendants ?? ATTENDANTS,
    listSlots: async () => (overrides.slots ?? SLOTS).map((iso) => new Date(iso)),
    book: async (params: BookAgendaParams): Promise<Booking> => {
      const key = `${params.resourceId}@${params.startsAt.toISOString()}`;
      if (taken.has(key)) throw new SlotUnavailableError(params.resourceId, {
          start: params.startsAt,
          end: params.startsAt,
        });
      taken.add(key);
      booked.push(params);

      return { id: 'booking-1', startsAt: params.startsAt } as Booking;
    },
  } as unknown as SchedulingAgenda;

  return { agenda, booked };
}

function handlersOf(agenda: SchedulingAgenda): Map<FlowActionKind, FlowActionHandler> {
  const handlers = new Map<FlowActionKind, FlowActionHandler>();

  registerSchedulingFlowActions({
    registry: { registerFlowAction: (kind, handler) => handlers.set(kind, handler) },
    agenda,
  });

  return handlers;
}

const SESSION_DATA = { id: SESSION, whatsappNumber: '5511999999999' } as ConversationSession;

function nodeOf(actionKind: string, actionParams: Record<string, unknown> = {}): FlowNodeData {
  return { id: `no_${actionKind}`, type: 'action', actionKind, actionParams };
}

async function run(params: {
  readonly agenda: SchedulingAgenda;
  readonly kind: FlowActionKind;
  readonly channel: ChannelAdapterInterface;
  readonly context?: Record<string, unknown>;
  readonly actionParams?: Record<string, unknown>;
}) {
  const handler = handlersOf(params.agenda).get(params.kind);
  if (!handler) throw new Error(`acao nao registrada: ${params.kind}`);

  return handler({
    node: nodeOf(params.kind, params.actionParams ?? {}),
    session: SESSION_DATA,
    channel: params.channel,
    context: params.context ?? {},
  });
}

describe('list_schedule_agents', () => {
  test('oferece quem atende e guarda o que ofereceu', async () => {
    const { agenda } = fakeAgenda();
    const { channel, lists } = fakeChannel();

    const result = await run({ agenda, kind: SCHEDULING_FLOW_ACTION_KIND.LIST_AGENTS, channel });

    expect(lists[0]?.rows).toEqual([{ id: ANA, title: 'Ana' }]);
    expect(result?.context?.[SCHEDULING_CONTEXT_KEY.AGENT_OPTIONS]).toEqual([ANA]);
    expect(result?.next).toBeUndefined();
  });

  test('agenda sem ninguem cadastrado chama uma pessoa em vez de listar', async () => {
    const { agenda } = fakeAgenda({ attendants: [] });
    const { channel, texts, lists } = fakeChannel();

    const result = await run({
      agenda,
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
    const { agenda } = fakeAgenda();
    const { channel, lists } = fakeChannel();

    const result = await run({
      agenda,
      kind: SCHEDULING_FLOW_ACTION_KIND.LIST_SLOTS,
      channel,
      context: { ...offered, [SCHEDULING_CONTEXT_KEY.AGENT_ID]: ANA },
    });

    expect(lists[0]?.rows.map((row) => row.id)).toEqual([...SLOTS]);
    expect(result?.context?.[SCHEDULING_CONTEXT_KEY.SLOT_OPTIONS]).toHaveLength(3);
  });

  /** Quem digita responde "1", e a posicao vale tanto quanto o id da linha tocada. */
  test('aceita a posicao na lista como escolha', async () => {
    const { agenda } = fakeAgenda();
    const { channel } = fakeChannel();

    const result = await run({
      agenda,
      kind: SCHEDULING_FLOW_ACTION_KIND.LIST_SLOTS,
      channel,
      context: { ...offered, [SCHEDULING_CONTEXT_KEY.AGENT_ID]: '1' },
    });

    expect(result?.context?.[SCHEDULING_CONTEXT_KEY.AGENT_ID]).toBe(ANA);
  });

  /** Id que nunca foi oferecido nao vira consulta a agenda de outra pessoa. */
  test('recusa escolha que nao estava na lista', async () => {
    const { agenda } = fakeAgenda();
    const { channel, texts } = fakeChannel();

    const result = await run({
      agenda,
      kind: SCHEDULING_FLOW_ACTION_KIND.LIST_SLOTS,
      channel,
      context: { ...offered, [SCHEDULING_CONTEXT_KEY.AGENT_ID]: BRUNO },
      actionParams: { [SCHEDULING_FLOW_PARAM.RETRY_NEXT]: AGENTS_NODE },
    });

    expect(texts).toEqual([SCHEDULING_FLOW_MESSAGE.NOT_UNDERSTOOD]);
    expect(result?.next).toBe(AGENTS_NODE);
  });

  test('sem horario livre a conversa vai para uma pessoa', async () => {
    const { agenda } = fakeAgenda({ slots: [] });
    const { channel, texts } = fakeChannel();

    const result = await run({
      agenda,
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
    const { agenda, booked } = fakeAgenda();
    const { channel, texts } = fakeChannel();

    const result = await run({ agenda, kind: SCHEDULING_FLOW_ACTION_KIND.BOOK, channel, context: chosen });

    expect(booked).toHaveLength(1);
    expect(booked[0]?.sessionId).toBe(SESSION);
    expect(booked[0]?.resourceId).toBe(ANA);
    expect(texts[0]).toContain(SCHEDULING_FLOW_MESSAGE.BOOKED);
    // Sem `next`: reservado, a conversa termina no proprio no.
    expect(result?.next).toBeUndefined();
  });

  test('horario tomado no meio do caminho volta para a lista', async () => {
    const { agenda, booked } = fakeAgenda({ taken: [`${ANA}@${FIRST_SLOT}`] });
    const { channel, texts } = fakeChannel();

    const result = await run({
      agenda,
      kind: SCHEDULING_FLOW_ACTION_KIND.BOOK,
      channel,
      context: chosen,
      actionParams: { [SCHEDULING_FLOW_PARAM.RETRY_NEXT]: SLOTS_NODE },
    });

    expect(booked).toHaveLength(0);
    expect(texts).toEqual([SCHEDULING_FLOW_MESSAGE.TAKEN]);
    expect(result?.next).toBe(SLOTS_NODE);
  });

  /** Instante que ninguem ofereceu nao vira reserva, mesmo sendo um horario valido da agenda. */
  test('recusa horario que nao estava na lista oferecida', async () => {
    const { agenda, booked } = fakeAgenda();
    const { channel, texts } = fakeChannel();

    const result = await run({
      agenda,
      kind: SCHEDULING_FLOW_ACTION_KIND.BOOK,
      channel,
      context: { ...chosen, [SCHEDULING_CONTEXT_KEY.SLOT]: '2026-08-21T13:00:00.000Z' },
      actionParams: { [SCHEDULING_FLOW_PARAM.RETRY_NEXT]: SLOTS_NODE },
    });

    expect(booked).toHaveLength(0);
    expect(texts).toEqual([SCHEDULING_FLOW_MESSAGE.NOT_UNDERSTOOD]);
    expect(result?.next).toBe(SLOTS_NODE);
  });
});
