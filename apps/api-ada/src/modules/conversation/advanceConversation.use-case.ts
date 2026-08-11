/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { FlowGraphData } from '@adatechnology/meta-whatsapp-contracts';

import {
  CONVERSATION_COMMAND,
  CONVERSATION_MESSAGE,
  CONVERSATION_OUTCOME,
  DEFAULT_FLOW_KEY,
  FALLBACK_COUNT_CONTEXT_KEY,
  MAX_CONSECUTIVE_FALLBACKS,
  MAX_CROSS_FLOW_JUMPS,
  MAX_FLOW_STEPS,
} from '@/modules/conversation/conversation.constant';
import { toConversationSession } from '@/modules/conversation/conversation.mapper';
import { resolveConversationCommand } from '@/modules/conversation/conversationCommand.resolver';
import { isChoiceNode, validateFlowAnswer } from '@/modules/conversation/flowAnswer.validator';
import { presentFlowNode } from '@/modules/conversation/flowNode.presenter';
import type {
  AdvanceConversationDependencies,
  AdvanceConversationParams,
  AdvanceConversationResult,
  AnswerNodeParams,
  ConversationStepParams,
  HandOffFromConversationParams,
  RunConversationCommandParams,
  RunFlowParams,
  SettleFlowParams,
} from '@/modules/conversation/types/conversation.types';
import { HANDOFF_REASON, SESSION_MODE } from '@/shared/constants/domain.constant';

function readFallbackCount(context: Record<string, unknown>): number {
  const value = context[FALLBACK_COUNT_CONTEXT_KEY];

  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * Leva a conversa um passo adiante a cada mensagem do cliente.
 *
 * O interpretador do SDK so calcula posicao no grafo: quem apresenta o no, valida a resposta e
 * decide quando chamar uma pessoa e esta camada. Nada aqui gera texto — o que o grafo nao previu
 * vira atendimento humano, nunca uma resposta improvisada.
 */
export class AdvanceConversationUseCase {
  constructor(private readonly dependencies: AdvanceConversationDependencies) {}

  async execute(params: AdvanceConversationParams): Promise<AdvanceConversationResult> {
    const { sessions, companyId, startState } = this.dependencies;
    const session = await sessions.getOrCreate(companyId, params.whatsappNumber, startState);

    if (session.mode === SESSION_MODE.HUMAN) return { outcome: CONVERSATION_OUTCOME.HUMAN };

    const graph = await this.loadGraph(session.flowKey ?? DEFAULT_FLOW_KEY);
    if (!graph) return this.handOff({ params, reason: HANDOFF_REASON.OUT_OF_FLOW });

    const nodeId = session.currentNodeId;
    const node = nodeId ? graph.nodes[nodeId] : undefined;

    // Sem no corrente — conversa nova, encerrada, ou apontando para um no que sumiu numa
    // republicacao do grafo — a conversa recomeca do inicio em vez de morrer numa posicao invalida.
    if (!nodeId || !node) return this.startFlow({ params, session, graph });

    return this.answerNode({ params, session, graph, node, nodeId });
  }

  private async loadGraph(key: string): Promise<FlowGraphData | undefined> {
    const { getFlowGraph, companyId } = this.dependencies;

    return getFlowGraph.execute({ companyId, key });
  }

  private async handOff({ params, reason }: HandOffFromConversationParams): Promise<AdvanceConversationResult> {
    await this.dependencies.requestHandoff.execute({
      whatsappNumber: params.whatsappNumber,
      channel: params.channel,
      reason,
    });

    return { outcome: CONVERSATION_OUTCOME.HANDED_OFF };
  }

  private async startFlow({ params, session, graph }: ConversationStepParams): Promise<AdvanceConversationResult> {
    const { sessions, companyId } = this.dependencies;

    await sessions.setFlowPosition(companyId, params.whatsappNumber, graph.key, graph.startNodeId);

    // O texto desta mensagem e descartado de proposito: e o "oi" que abriu a conversa, e o no
    // inicial ainda nao perguntou nada que pudesse ser respondido.
    return this.runFrom({ params, session, graph, nodeId: graph.startNodeId, context: session.context });
  }

  private async answerNode({ params, session, graph, node, nodeId }: AnswerNodeParams): Promise<AdvanceConversationResult> {
    const validation = validateFlowAnswer({ node, text: params.text });

    // Num no de escolha a opcao vence o comando: grafo que ja tenha um `voltar` desenhado continua
    // mandando na propria palavra. Ja pergunta de texto livre aceita qualquer coisa, entao ali o
    // comando vem antes — ninguem se chama "sair", e sem isso nao haveria como desistir da pergunta.
    const command = resolveConversationCommand(params.text);
    if (command && (!validation.isValid || !isChoiceNode(node))) {
      return this.runCommand({ params, session, graph, command });
    }

    if (!validation.isValid) return this.handleInvalidAnswer({ params, session, graph, node, nodeId });

    const context = { ...session.context, [FALLBACK_COUNT_CONTEXT_KEY]: 0 };

    return this.runFrom({ params, session, graph, nodeId, context, userAnswer: validation.answer });
  }

  private async runCommand({ params, session, graph, command }: RunConversationCommandParams): Promise<AdvanceConversationResult> {
    if (command === CONVERSATION_COMMAND.HUMAN) {
      return this.handOff({ params, reason: HANDOFF_REASON.CONTACT_REQUESTED });
    }

    if (command === CONVERSATION_COMMAND.MENU) return this.restartFlow({ params, session, graph });

    return this.exitConversation(params);
  }

  /**
   * Volta ao inicio sem reperguntar o que o cliente ja respondeu.
   *
   * O no inicial do fluxo pergunta o nome, e um `menu` cru o perguntaria de novo a cada volta. Se a
   * resposta ja esta no contexto, ela e reentregue ao interpretador como se tivesse sido digitada
   * agora: o no e satisfeito sem aparecer na tela, e a conversa cai direto no menu.
   */
  private async restartFlow({ params, session, graph }: ConversationStepParams): Promise<AdvanceConversationResult> {
    const { sessions, companyId } = this.dependencies;
    const startNode = graph.nodes[graph.startNodeId];
    const answered = startNode?.contextKey ? session.context[startNode.contextKey] : undefined;

    if (typeof answered !== 'string' || !answered) return this.startFlow({ params, session, graph });

    await sessions.setFlowPosition(companyId, params.whatsappNumber, graph.key, graph.startNodeId);

    return this.runFrom({
      params,
      session,
      graph,
      nodeId: graph.startNodeId,
      context: { ...session.context, [FALLBACK_COUNT_CONTEXT_KEY]: 0 },
      userAnswer: answered,
    });
  }

  /**
   * Encerra por pedido do cliente, com a despedida que o painel configurou.
   *
   * A posicao no grafo cai junto: a proxima mensagem cai no `!nodeId` do `execute` e a conversa
   * recomeca do menu, em vez de voltar para a pergunta que o cliente acabou de abandonar.
   */
  private async exitConversation(params: AdvanceConversationParams): Promise<AdvanceConversationResult> {
    const { sessions, settings, companyId } = this.dependencies;
    const configured = await settings.get(companyId);

    await sessions.setFlowPosition(companyId, params.whatsappNumber, null, null);
    await sessions.patchContext(companyId, params.whatsappNumber, { [FALLBACK_COUNT_CONTEXT_KEY]: 0 });
    await params.channel.sendText(
      params.whatsappNumber,
      configured.farewellMessage.trim() || CONVERSATION_MESSAGE.CLOSING,
    );

    return { outcome: CONVERSATION_OUTCOME.COMPLETED };
  }

  private async handleInvalidAnswer({ params, session, node }: AnswerNodeParams): Promise<AdvanceConversationResult> {
    const { sessions, companyId } = this.dependencies;
    const attempts = readFallbackCount(session.context) + 1;

    // Regra do produto: o robo nao inventa resposta. Duas tentativas fora do fluxo e o caso vai
    // para uma pessoa, que e quem sabe responder o que o grafo nao previu.
    if (attempts >= MAX_CONSECUTIVE_FALLBACKS) {
      return this.handOff({ params, reason: HANDOFF_REASON.REPEATED_FALLBACK });
    }

    await sessions.patchContext(companyId, params.whatsappNumber, { [FALLBACK_COUNT_CONTEXT_KEY]: attempts });
    await params.channel.sendText(params.whatsappNumber, node.fallbackMessage ?? CONVERSATION_MESSAGE.FALLBACK);
    await presentFlowNode({ node, to: params.whatsappNumber, channel: params.channel, isRepeat: true });

    return { outcome: CONVERSATION_OUTCOME.FALLBACK };
  }

  private async runFrom({ params, session, graph, nodeId, context, userAnswer }: RunFlowParams): Promise<AdvanceConversationResult> {
    const { interpreter } = this.dependencies;
    const conversationSession = toConversationSession(session);

    let activeGraph = graph;
    let activeNodeId = nodeId;
    let activeContext = context;
    let answer = userAnswer;

    for (let jump = 0; jump < MAX_CROSS_FLOW_JUMPS; jump += 1) {
      const result = await interpreter.run(
        {
          graph: activeGraph,
          currentNodeId: activeNodeId,
          context: activeContext,
          session: conversationSession,
          channel: params.channel,
          // `exactOptionalPropertyTypes`: passar `userAnswer: undefined` nao compila.
          ...(answer === undefined ? {} : { userAnswer: answer }),
        },
        { maxSteps: MAX_FLOW_STEPS },
      );

      if (result.kind !== 'cross-flow') return this.settle({ params, graph: activeGraph, result });

      const nextGraph = await this.loadGraph(result.flowKey);
      if (!nextGraph) return this.handOff({ params, reason: HANDOFF_REASON.OUT_OF_FLOW });

      activeGraph = nextGraph;
      activeNodeId = nextGraph.startNodeId;
      activeContext = result.context;
      answer = undefined;
    }

    // Grafos se chamando em circulo: quem desfaz o no e uma pessoa, nao mais uma volta do laco.
    return this.handOff({ params, reason: HANDOFF_REASON.OUT_OF_FLOW });
  }

  private async settle({ params, graph, result }: SettleFlowParams): Promise<AdvanceConversationResult> {
    const { sessions, companyId } = this.dependencies;
    const whatsappNumber = params.whatsappNumber;

    if (result.kind === 'awaiting-answer') {
      const node = graph.nodes[result.nodeId];
      if (!node) return this.handOff({ params, reason: HANDOFF_REASON.OUT_OF_FLOW });

      await sessions.setFlowPosition(companyId, whatsappNumber, graph.key, result.nodeId);
      await sessions.patchContext(companyId, whatsappNumber, result.context);
      await presentFlowNode({ node, to: whatsappNumber, channel: params.channel });

      return { outcome: CONVERSATION_OUTCOME.PRESENTED };
    }

    await sessions.setFlowPosition(companyId, whatsappNumber, null, null);
    await sessions.patchContext(companyId, whatsappNumber, result.context);

    if (result.kind === 'max-steps-exceeded') return this.handOff({ params, reason: HANDOFF_REASON.OUT_OF_FLOW });

    // Um no de acao pode ter passado a conversa para uma pessoa no meio do caminho; ai o fluxo
    // terminou porque acabou, e a despedida por cima seria o robo falando depois de entregar.
    const current = await sessions.getContext(companyId, whatsappNumber);
    if (current?.mode === SESSION_MODE.HUMAN) return { outcome: CONVERSATION_OUTCOME.HANDED_OFF };

    await params.channel.sendText(whatsappNumber, CONVERSATION_MESSAGE.CLOSING);

    return { outcome: CONVERSATION_OUTCOME.COMPLETED };
  }
}
