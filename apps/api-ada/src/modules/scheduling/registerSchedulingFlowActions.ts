/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import {
  WHATSAPP_CHOICE_LIMIT,
  type ChannelAdapterInterface,
  type ConversationSession,
  type FlowActionResult,
  type FlowNodeData,
} from '@adatechnology/meta-whatsapp-contracts';

import { SlotUnavailableError } from '@adatechnology/scheduling-contracts';

import {
  SCHEDULING_CONTEXT_KEY,
  SCHEDULING_FLOW_ACTION_KIND,
  SCHEDULING_FLOW_MESSAGE,
  SCHEDULING_FLOW_PARAM,
  SCHEDULING_FLOW_TERMINAL,
  SCHEDULING_RESOURCE_TIMEZONE as SCHEDULING_FALLBACK_TIMEZONE,
} from '@/modules/scheduling/scheduling.constant';
import {
  formatSlotLabel,
  readOfferedOptions,
  resolveOfferedChoice,
} from '@/modules/scheduling/schedulingFlow.util';
import type { RegisterSchedulingFlowActionsParams } from '@/modules/scheduling/types/scheduling.types';

type ActionParams = {
  readonly node: FlowNodeData;
  readonly session: ConversationSession;
  readonly channel: ChannelAdapterInterface;
  readonly context: Record<string, unknown>;
};

/** Destino declarado pelo grafo; sem ele a conversa termina em vez de seguir o caminho feliz. */
function paramNext(node: FlowNodeData, key: string): string {
  const value = node.actionParams?.[key];

  return typeof value === 'string' && value.length > 0 ? value : SCHEDULING_FLOW_TERMINAL;
}

async function sayAndGo(params: {
  readonly channel: ChannelAdapterInterface;
  readonly to: string;
  readonly text: string;
  readonly next: string;
}): Promise<FlowActionResult> {
  await params.channel.sendText(params.to, params.text);

  return { next: params.next };
}

/**
 * Liga os nos de acao do grafo a agenda.
 *
 * As tres acoes existem porque a escolha e dinamica: quem atende e quais horarios sobraram so se
 * sabe na hora da conversa, e `options` no grafo e estatico. Cada acao monta a lista, envia, e
 * guarda no contexto o que foi oferecido — a proxima acao so aceita resposta que esteja nessa lista.
 *
 * O no de pergunta que segue cada listagem **nao declara `question`**: o texto ja foi o corpo da
 * lista interativa, e repeti-lo mandaria a mesma frase duas vezes.
 *
 * Reservar acontece aqui dentro, em processo, e nao por rota HTTP: um endpoint publico de reserva
 * seria uma porta anonima para ocupar a agenda inteira do time.
 */
export function registerSchedulingFlowActions({
  registry,
  agenda,
}: RegisterSchedulingFlowActionsParams): void {
  async function listAgents({ node, session, channel }: ActionParams): Promise<FlowActionResult> {
    const agents = await agenda.listAttendants();

    if (agents.length === 0) {
      return sayAndGo({
        channel,
        to: session.whatsappNumber,
        text: SCHEDULING_FLOW_MESSAGE.NO_AGENTS,
        next: paramNext(node, SCHEDULING_FLOW_PARAM.UNAVAILABLE_NEXT),
      });
    }

    const offered = agents.slice(0, WHATSAPP_CHOICE_LIMIT.LIST_ROWS);

    await channel.sendInteractiveList({
      to: session.whatsappNumber,
      body: SCHEDULING_FLOW_MESSAGE.AGENTS_QUESTION,
      buttonLabel: SCHEDULING_FLOW_MESSAGE.AGENTS_BUTTON,
      rows: offered.map((agent) => ({
        id: agent.id,
        title: agent.name.slice(0, WHATSAPP_CHOICE_LIMIT.LIST_ROW_TITLE_LENGTH),
      })),
    });

    return { context: { [SCHEDULING_CONTEXT_KEY.AGENT_OPTIONS]: offered.map((agent) => agent.id) } };
  }

  async function listSlots({ node, session, channel, context }: ActionParams): Promise<FlowActionResult> {
    const agentId = resolveOfferedChoice({
      offered: readOfferedOptions({ context, key: SCHEDULING_CONTEXT_KEY.AGENT_OPTIONS }),
      answer: context[SCHEDULING_CONTEXT_KEY.AGENT_ID],
    });

    if (!agentId) {
      return sayAndGo({
        channel,
        to: session.whatsappNumber,
        text: SCHEDULING_FLOW_MESSAGE.NOT_UNDERSTOOD,
        next: paramNext(node, SCHEDULING_FLOW_PARAM.RETRY_NEXT),
      });
    }

    const [attendants, slots] = await Promise.all([agenda.listAttendants(), agenda.listSlots(agentId)]);
    const timezone = attendants.find((attendant) => attendant.id === agentId)?.timezone ?? SCHEDULING_FALLBACK_TIMEZONE;

    if (slots.length === 0) {
      return sayAndGo({
        channel,
        to: session.whatsappNumber,
        text: SCHEDULING_FLOW_MESSAGE.NO_SLOTS,
        next: paramNext(node, SCHEDULING_FLOW_PARAM.UNAVAILABLE_NEXT),
      });
    }

    const offered = slots.slice(0, WHATSAPP_CHOICE_LIMIT.LIST_ROWS);

    await channel.sendInteractiveList({
      to: session.whatsappNumber,
      body: SCHEDULING_FLOW_MESSAGE.SLOTS_QUESTION,
      buttonLabel: SCHEDULING_FLOW_MESSAGE.SLOTS_BUTTON,
      rows: offered.map((startsAt) => ({
        id: startsAt.toISOString(),
        title: formatSlotLabel({ startsAt, timezone }),
      })),
    });

    return {
      context: {
        [SCHEDULING_CONTEXT_KEY.AGENT_ID]: agentId,
        [SCHEDULING_CONTEXT_KEY.SLOT_OPTIONS]: offered.map((startsAt) => startsAt.toISOString()),
      },
    };
  }

  async function book({ node, session, channel, context }: ActionParams): Promise<FlowActionResult> {
    const agentId = context[SCHEDULING_CONTEXT_KEY.AGENT_ID];
    const chosen = resolveOfferedChoice({
      offered: readOfferedOptions({ context, key: SCHEDULING_CONTEXT_KEY.SLOT_OPTIONS }),
      answer: context[SCHEDULING_CONTEXT_KEY.SLOT],
    });

    if (typeof agentId !== 'string' || !chosen) {
      return sayAndGo({
        channel,
        to: session.whatsappNumber,
        text: SCHEDULING_FLOW_MESSAGE.NOT_UNDERSTOOD,
        next: paramNext(node, SCHEDULING_FLOW_PARAM.RETRY_NEXT),
      });
    }

    const startsAt = new Date(chosen);

    try {
      const booking = await agenda.book({ sessionId: session.id, resourceId: agentId, startsAt });
      const attendants = await agenda.listAttendants();
      const timezone =
        attendants.find((attendant) => attendant.id === agentId)?.timezone ?? SCHEDULING_FALLBACK_TIMEZONE;
      const when = formatSlotLabel({ startsAt: booking.startsAt, timezone });

      await channel.sendText(
        session.whatsappNumber,
        `${SCHEDULING_FLOW_MESSAGE.BOOKED} *${when}*.`,
      );

      return {};
    } catch (error) {
      // Horario tomado entre a lista e o toque nao e falha: e a corrida normal de duas pessoas na
      // mesma agenda, e a saida e remontar a lista, nao devolver erro ao cliente.
      if (!(error instanceof SlotUnavailableError)) throw error;

      return sayAndGo({
        channel,
        to: session.whatsappNumber,
        text: SCHEDULING_FLOW_MESSAGE.TAKEN,
        next: paramNext(node, SCHEDULING_FLOW_PARAM.RETRY_NEXT),
      });
    }
  }

  registry.registerFlowAction(SCHEDULING_FLOW_ACTION_KIND.LIST_AGENTS, listAgents);
  registry.registerFlowAction(SCHEDULING_FLOW_ACTION_KIND.LIST_SLOTS, listSlots);
  registry.registerFlowAction(SCHEDULING_FLOW_ACTION_KIND.BOOK, book);
}
