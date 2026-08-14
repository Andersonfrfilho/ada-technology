/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { ACTOR_TYPE, AUDIT_ACTION, AUDIT_TARGET } from '@/modules/audit/audit.constant';
import { widgetMessageSchema } from '@/modules/channel/widget/widget.schema';
import { channelOfConversationKey } from '@/modules/panel/conversationChannel';
import { PANEL_CHANNEL } from '@/modules/panel/panel.constant';
import { SIMULATION_COMMAND_KIND } from '@/modules/simulation/simulation.constant';
import { SimulationChannelUnavailableError } from '@/modules/simulation/simulation.error';
import type {
  SimulateInboundMessageDependencies,
  SimulateInboundMessageParams,
  SimulatedInboundCommand,
} from '@/modules/simulation/types/simulation.types';

type DeliverParams = {
  readonly conversationKey: string;
  readonly command: SimulatedInboundCommand;
};

type DeliverToWidgetParams = {
  readonly sessionId: string;
  readonly command: SimulatedInboundCommand;
};

/**
 * Mensagem que o atendente escreve fingindo ser o cliente, na conversa que ele esta olhando.
 *
 * A entrega delega ao mesmo caso de uso do canal real — nao ha gravacao direta em tabela. E o que
 * torna a simulacao util: se o fluxo, a moderacao ou a janela de atendimento recusarem a mensagem,
 * recusam aqui tambem, e o atendente ve o comportamento de producao em vez de um teatro.
 *
 * A chave da conversa (telefone ou id de sessao do widget) e resolvida aqui dentro e nunca chega ao
 * navegador: o id de sessao vale como credencial nas rotas anonimas do chat do site.
 */
export class SimulateInboundMessageUseCase {
  constructor(private readonly dependencies: SimulateInboundMessageDependencies) {}

  async execute({ conversationId, command, agentId, ipAddress }: SimulateInboundMessageParams): Promise<void> {
    const { resolveConversation, recordAudit } = this.dependencies;
    const conversation = await resolveConversation.execute(conversationId);

    await this.deliver({ conversationKey: conversation.conversationKey, command });

    // Metadado sem conteudo: a trilha responde "quem simulou na conversa X", nao o que foi dito.
    await recordAudit.execute({
      actorType: ACTOR_TYPE.AGENT,
      actorId: agentId,
      action: AUDIT_ACTION.CONVERSATION_SIMULATED,
      targetType: AUDIT_TARGET.CONVERSATION,
      targetId: conversation.conversationId,
      ipAddress,
      metadata: { kind: command.kind },
    });
  }

  private async deliver({ conversationKey, command }: DeliverParams): Promise<void> {
    if (channelOfConversationKey(conversationKey) === PANEL_CHANNEL.WEBCHAT) {
      await this.deliverToWidget({ sessionId: conversationKey, command });
      return;
    }

    const { whatsapp } = this.dependencies;
    if (!whatsapp) throw new SimulationChannelUnavailableError(PANEL_CHANNEL.WHATSAPP);

    await whatsapp.deliver({ from: conversationKey, command });
  }

  /**
   * Toque em opcao sai como texto com o rotulo: e exatamente o que o botao do widget manda.
   *
   * O texto passa pelo schema do widget para o teto ser o do canal, e nao o do painel — mensagem
   * simulada precisa ser recusada onde a de verdade seria.
   */
  private async deliverToWidget({ sessionId, command }: DeliverToWidgetParams): Promise<void> {
    const { postWidgetMessage, postWidgetAudio } = this.dependencies;

    if (command.kind === SIMULATION_COMMAND_KIND.AUDIO) {
      await postWidgetAudio.execute({ sessionId, audio: command.audio });
      return;
    }

    const raw = command.kind === SIMULATION_COMMAND_KIND.TEXT ? command.text : command.option.title;
    const { text } = widgetMessageSchema.parse({ text: raw });

    await postWidgetMessage.execute({ sessionId, text });
  }
}
