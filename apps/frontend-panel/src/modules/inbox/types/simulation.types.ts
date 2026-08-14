/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { ConversationSimulatorClient } from '@adatechnology/conversations-ui';

import type { SIMULATION_COMMAND_KIND } from '@/modules/inbox/simulation.constant';

/**
 * O tipo de midia sai do proprio contrato do pacote.
 *
 * O `index` nao reexporta `SimulatorMediaKind`, e redeclarar a lista aqui deixaria os dois lados
 * divergirem em silencio no dia em que o pacote aceitar mais um tipo.
 */
export type SimulationMediaKind = NonNullable<ConversationSimulatorClient['acceptedMediaKinds']>[number];

/** O que este ambiente sabe simular. Canal ausente da lista nao desenha o botao. */
export type SimulationCapability = {
  readonly channel: 'webchat' | 'whatsapp';
  readonly acceptedMediaKinds: readonly SimulationMediaKind[];
};

export type SimulationCapabilities = {
  readonly channels: readonly SimulationCapability[];
};

export type SimulationCommand =
  | { readonly kind: typeof SIMULATION_COMMAND_KIND.TEXT; readonly text: string }
  | {
      readonly kind: typeof SIMULATION_COMMAND_KIND.REPLY;
      readonly option: { readonly id: string; readonly title: string };
    };

export type PostSimulationCommandParams = {
  readonly conversationId: string;
  readonly command: SimulationCommand;
};

export type PostSimulationAudioParams = {
  readonly conversationId: string;
  readonly file: File;
};
