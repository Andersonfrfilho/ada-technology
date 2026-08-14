/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { AUDIT_ACTION } from '@/modules/audit/audit.constant';
import { WIDGET_MESSAGE_MAX_LENGTH } from '@/modules/channel/widget/widget.constant';
import { SimulateInboundMessageUseCase } from '@/modules/simulation/simulateInboundMessage.use-case';
import { SIMULATION_COMMAND_KIND } from '@/modules/simulation/simulation.constant';
import { SimulationChannelUnavailableError } from '@/modules/simulation/simulation.error';
import type {
  DeliverSimulatedInboundParams,
  SimulateInboundMessageDependencies,
} from '@/modules/simulation/types/simulation.types';

const CONVERSATION_ID = '2a2c2f14-2b8a-4a3f-9a5e-6f1f5a7f9b10';
const WIDGET_KEY = 'w0123456789abcdef';
const PHONE_KEY = '5511999999999';
const AGENT_ID = 'agent-1';
const IP_ADDRESS = '203.0.113.10';

type Recorded = {
  readonly widgetMessages: { sessionId: string; text: string }[];
  readonly widgetAudios: { sessionId: string; mimeType: string }[];
  readonly whatsappDeliveries: DeliverSimulatedInboundParams[];
  readonly audits: Record<string, unknown>[];
};

function createDependencies(conversationKey: string, withWhatsApp = true): {
  dependencies: SimulateInboundMessageDependencies;
  recorded: Recorded;
} {
  const recorded: Recorded = {
    widgetMessages: [],
    widgetAudios: [],
    whatsappDeliveries: [],
    audits: [],
  };

  const whatsapp = {
    deliver: async (params: DeliverSimulatedInboundParams) => {
      recorded.whatsappDeliveries.push(params);
    },
  };

  const dependencies = {
    resolveConversation: {
      execute: async (conversationId: string) => ({ conversationId, conversationKey }),
    },
    postWidgetMessage: {
      execute: async ({ sessionId, text }: { sessionId: string; text: string }) => {
        recorded.widgetMessages.push({ sessionId, text });
        return { outcome: 'answered' };
      },
    },
    postWidgetAudio: {
      execute: async ({ sessionId, audio }: { sessionId: string; audio: { mimeType: string } }) => {
        recorded.widgetAudios.push({ sessionId, mimeType: audio.mimeType });
        return { outcome: 'answered' };
      },
    },
    recordAudit: {
      execute: async (entry: Record<string, unknown>) => {
        recorded.audits.push(entry);
      },
    },
    ...(withWhatsApp ? { whatsapp } : {}),
  } as unknown as SimulateInboundMessageDependencies;

  return { dependencies, recorded };
}

const textCommand = { kind: SIMULATION_COMMAND_KIND.TEXT, text: 'quero saber o preco' } as const;

describe('SimulateInboundMessageUseCase', () => {
  it('entrega o texto do chat do site pelo caso de uso do canal, e nao por escrita direta', async () => {
    const { dependencies, recorded } = createDependencies(WIDGET_KEY);

    await new SimulateInboundMessageUseCase(dependencies).execute({
      conversationId: CONVERSATION_ID,
      command: textCommand,
      agentId: AGENT_ID,
      ipAddress: IP_ADDRESS,
    });

    expect(recorded.widgetMessages).toEqual([{ sessionId: WIDGET_KEY, text: 'quero saber o preco' }]);
    expect(recorded.whatsappDeliveries).toHaveLength(0);
  });

  it('manda o rotulo da opcao como texto, que e o que o botao do widget faz', async () => {
    const { dependencies, recorded } = createDependencies(WIDGET_KEY);

    await new SimulateInboundMessageUseCase(dependencies).execute({
      conversationId: CONVERSATION_ID,
      command: { kind: SIMULATION_COMMAND_KIND.REPLY, option: { id: 'falar', title: 'Falar com alguem' } },
      agentId: AGENT_ID,
      ipAddress: IP_ADDRESS,
    });

    expect(recorded.widgetMessages).toEqual([{ sessionId: WIDGET_KEY, text: 'Falar com alguem' }]);
  });

  it('recusa texto acima do teto do canal, como a rota do visitante recusaria', async () => {
    const { dependencies, recorded } = createDependencies(WIDGET_KEY);

    const attempt = new SimulateInboundMessageUseCase(dependencies).execute({
      conversationId: CONVERSATION_ID,
      command: { kind: SIMULATION_COMMAND_KIND.TEXT, text: 'a'.repeat(WIDGET_MESSAGE_MAX_LENGTH + 1) },
      agentId: AGENT_ID,
      ipAddress: IP_ADDRESS,
    });

    await expect(attempt).rejects.toThrow();
    expect(recorded.widgetMessages).toHaveLength(0);
  });

  it('leva o audio para a mesma transcricao do visitante', async () => {
    const { dependencies, recorded } = createDependencies(WIDGET_KEY);

    await new SimulateInboundMessageUseCase(dependencies).execute({
      conversationId: CONVERSATION_ID,
      command: {
        kind: SIMULATION_COMMAND_KIND.AUDIO,
        audio: { buffer: Buffer.from('clip'), mimeType: 'audio/webm' },
      },
      agentId: AGENT_ID,
      ipAddress: IP_ADDRESS,
    });

    expect(recorded.widgetAudios).toEqual([{ sessionId: WIDGET_KEY, mimeType: 'audio/webm' }]);
  });

  it('injeta no webhook do WhatsApp com a chave resolvida no servidor', async () => {
    const { dependencies, recorded } = createDependencies(PHONE_KEY);

    await new SimulateInboundMessageUseCase(dependencies).execute({
      conversationId: CONVERSATION_ID,
      command: textCommand,
      agentId: AGENT_ID,
      ipAddress: IP_ADDRESS,
    });

    expect(recorded.whatsappDeliveries).toEqual([{ from: PHONE_KEY, command: textCommand }]);
    expect(recorded.widgetMessages).toHaveLength(0);
  });

  it('sem canal ligado no ambiente, a simulacao de WhatsApp falha em vez de fingir entrega', async () => {
    const { dependencies, recorded } = createDependencies(PHONE_KEY, false);

    const attempt = new SimulateInboundMessageUseCase(dependencies).execute({
      conversationId: CONVERSATION_ID,
      command: textCommand,
      agentId: AGENT_ID,
      ipAddress: IP_ADDRESS,
    });

    await expect(attempt).rejects.toBeInstanceOf(SimulationChannelUnavailableError);
    expect(recorded.audits).toHaveLength(0);
  });

  it('audita quem simulou sem guardar o que foi dito', async () => {
    const { dependencies, recorded } = createDependencies(WIDGET_KEY);

    await new SimulateInboundMessageUseCase(dependencies).execute({
      conversationId: CONVERSATION_ID,
      command: textCommand,
      agentId: AGENT_ID,
      ipAddress: IP_ADDRESS,
    });

    expect(recorded.audits).toHaveLength(1);
    expect(recorded.audits[0]).toMatchObject({
      actorId: AGENT_ID,
      action: AUDIT_ACTION.CONVERSATION_SIMULATED,
      targetId: CONVERSATION_ID,
      ipAddress: IP_ADDRESS,
      metadata: { kind: SIMULATION_COMMAND_KIND.TEXT },
    });
    expect(JSON.stringify(recorded.audits[0])).not.toContain(textCommand.text);
  });
});
