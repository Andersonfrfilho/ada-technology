/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { createHmac } from 'node:crypto';

import type { WhatsAppWebhookPayload } from '@adatechnology/meta-whatsapp-contracts';
import {
  buildInboundInteractivePayload,
  buildInboundTextPayload,
  serializeWebhookPayload,
} from '@adatechnology/meta-whatsapp-contracts/testing';

import { PANEL_CHANNEL } from '@/modules/panel/panel.constant';
import {
  SIMULATION_COMMAND_KIND,
  SIMULATION_SIGNATURE_ALGORITHM,
  SIMULATION_SIGNATURE_PREFIX,
} from '@/modules/simulation/simulation.constant';
import { SimulationCommandUnsupportedError } from '@/modules/simulation/simulation.error';
import type {
  DeliverSimulatedInboundParams,
  WhatsAppInboundSimulatorDependencies,
} from '@/modules/simulation/types/simulation.types';

/**
 * Entrega a mensagem simulada pela mesma porta por onde a Meta entrega a de verdade.
 *
 * O payload e montado, serializado e assinado aqui dentro para o webhook nao precisar saber que a
 * origem foi o painel: ele valida assinatura, deduplica e roda o fluxo exatamente como faria com o
 * cliente do outro lado. Nao ha caminho de escrita paralelo.
 */
export class WhatsAppInboundSimulator {
  constructor(private readonly dependencies: WhatsAppInboundSimulatorDependencies) {}

  async deliver({ from, command }: DeliverSimulatedInboundParams): Promise<void> {
    const rawBody = serializeWebhookPayload(this.buildPayload({ from, command }));

    await this.dependencies.receiveWebhook.execute({
      companyId: this.dependencies.companyId,
      rawBody,
      signatureHeader: this.signatureOf(rawBody),
    });
  }

  /**
   * Toque em opcao vai como `listReply` porque e assim que este produto manda menu.
   *
   * O `id` da opcao e o que o motor de fluxo casa; o titulo viaja junto so para o transcript ficar
   * legivel, do mesmo jeito que a Meta devolve.
   */
  private buildPayload({ from, command }: DeliverSimulatedInboundParams): WhatsAppWebhookPayload {
    const envelope = {
      from,
      phoneNumberId: this.dependencies.phoneNumberId,
      wabaId: this.dependencies.businessAccountId,
    };

    if (command.kind === SIMULATION_COMMAND_KIND.TEXT) {
      return buildInboundTextPayload({ ...envelope, text: command.text });
    }

    if (command.kind === SIMULATION_COMMAND_KIND.REPLY) {
      return buildInboundInteractivePayload({ ...envelope, listReply: command.option });
    }

    throw new SimulationCommandUnsupportedError({ channel: PANEL_CHANNEL.WHATSAPP, kind: command.kind });
  }

  private signatureOf(rawBody: string): string {
    const digest = createHmac(SIMULATION_SIGNATURE_ALGORITHM, this.dependencies.appSecret)
      .update(rawBody)
      .digest('hex');

    return `${SIMULATION_SIGNATURE_PREFIX}${digest}`;
  }
}
