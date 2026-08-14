/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type {
  ConversationChannel,
  ConversationSimulatorClient,
  SimulatorTransportFactory,
} from '@adatechnology/conversations-ui';

import { CONVERSATION_PATH } from '@/modules/inbox/inbox.constant';
import { SIMULATION_AUDIO_FIELD, SIMULATION_COMMAND_KIND } from '@/modules/inbox/simulation.constant';
import type {
  PostSimulationAudioParams,
  PostSimulationCommandParams,
  SimulationCapability,
} from '@/modules/inbox/types/simulation.types';
import { HTTP_METHOD } from '@/modules/shared/http/http.constant';
import { panelRequest } from '@/modules/shared/http/panelHttpClient';

/**
 * Um transporte por canal que a API declarou saber simular.
 *
 * O painel nao conhece sessao de widget nem numero da Meta: manda o id opaco da conversa, e o
 * servidor resolve para a chave do canal. E o que mantem a credencial do widget fora do navegador do
 * atendente e a mensagem simulada no mesmo caminho da mensagem de verdade.
 */
export function simulationTransportsOf(
  capabilities: readonly SimulationCapability[],
): Partial<Record<ConversationChannel, SimulatorTransportFactory>> {
  return Object.fromEntries(
    capabilities.map((capability) => [capability.channel, transportFactoryOf(capability)]),
  );
}

function transportFactoryOf(capability: SimulationCapability): SimulatorTransportFactory {
  return ({ conversationId }) => ({
    sendText: (text) =>
      postCommand({ conversationId, command: { kind: SIMULATION_COMMAND_KIND.TEXT, text } }),
    sendReply: ({ option }) =>
      postCommand({
        conversationId,
        command: {
          kind: SIMULATION_COMMAND_KIND.REPLY,
          option: { id: option.id, title: option.title },
        },
      }),
    ...mediaCapabilityOf({ capability, conversationId }),
  });
}

type MediaCapabilityParams = {
  readonly capability: SimulationCapability;
  readonly conversationId: string;
};

/**
 * Canal sem midia simulavel sai sem `sendMedia`, e o compositor nao desenha clipe nem microfone.
 *
 * O WhatsApp esta neste caso: mandar audio pela Meta exigiria subir o arquivo na API de midia antes
 * do webhook cita-lo, e um microfone que falha ao ser tocado e pior que microfone nenhum.
 */
function mediaCapabilityOf({
  capability,
  conversationId,
}: MediaCapabilityParams): Pick<ConversationSimulatorClient, 'sendMedia' | 'acceptedMediaKinds'> {
  if (capability.acceptedMediaKinds.length === 0) return {};

  return {
    acceptedMediaKinds: capability.acceptedMediaKinds,
    sendMedia: ({ file }) => postAudio({ conversationId, file }),
  };
}

async function postCommand({ conversationId, command }: PostSimulationCommandParams): Promise<void> {
  await panelRequest<void>({
    path: CONVERSATION_PATH.SIMULATION(conversationId),
    method: HTTP_METHOD.POST,
    body: command,
  });
}

async function postAudio({ conversationId, file }: PostSimulationAudioParams): Promise<void> {
  const form = new FormData();
  form.append(SIMULATION_AUDIO_FIELD, file);

  await panelRequest<void>({
    path: CONVERSATION_PATH.SIMULATION_AUDIO(conversationId),
    method: HTTP_METHOD.POST,
    form,
  });
}
