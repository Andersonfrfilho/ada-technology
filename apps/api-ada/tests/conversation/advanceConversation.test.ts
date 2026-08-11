/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { FlowInterpreter } from '@adatechnology/meta-whatsapp-module';
import { beforeEach, describe, expect, test } from 'bun:test';

import { AdvanceConversationUseCase } from '@/modules/conversation/advanceConversation.use-case';
import { CONVERSATION_MESSAGE, CONVERSATION_OUTCOME } from '@/modules/conversation/conversation.constant';
import { registerConversationFlowActions } from '@/modules/conversation/registerFlowActions';
import { RequestHandoffUseCase } from '@/modules/conversation/requestHandoff.use-case';
import { SESSION_MODE } from '@/shared/constants/domain.constant';

import {
  ATENDIMENTO_GRAPH,
  asSessionRepository,
  COMPANY_ID,
  FakeChannel,
  FakeSessionRepository,
  fakeGetFlowGraph,
  fakeSettings,
  FAREWELL_MESSAGE,
  NOME_PRIMEIRO_GRAPH,
  WHATSAPP_NUMBER,
} from './conversation.fakes';

let repository: FakeSessionRepository;
let channel: FakeChannel;
let advance: AdvanceConversationUseCase;

beforeEach(() => {
  repository = new FakeSessionRepository();
  channel = new FakeChannel();

  const sessions = asSessionRepository(repository);
  const interpreter = new FlowInterpreter();
  const requestHandoff = new RequestHandoffUseCase({ sessions, companyId: COMPANY_ID });

  registerConversationFlowActions({ registry: interpreter, requestHandoff });

  advance = new AdvanceConversationUseCase({
    sessions,
    getFlowGraph: fakeGetFlowGraph({ [ATENDIMENTO_GRAPH.key]: ATENDIMENTO_GRAPH }),
    interpreter,
    requestHandoff,
    settings: fakeSettings(),
    companyId: COMPANY_ID,
    startState: 'start',
  });
});

function send(text: string): Promise<{ outcome: string }> {
  return advance.execute({ whatsappNumber: WHATSAPP_NUMBER, text, channel });
}

describe('AdvanceConversationUseCase', () => {
  test('a primeira mensagem apresenta o no inicial em vez de ser tratada como resposta', async () => {
    const result = await send('oi');

    expect(result.outcome).toBe(CONVERSATION_OUTCOME.PRESENTED);
    expect(channel.sent).toEqual([{ kind: 'list', body: 'Como posso ajudar?' }]);
    expect(repository.row.currentNodeId).toBe('menu');
  });

  test('aceita a posicao na lista como resposta e caminha ate a proxima pergunta', async () => {
    await send('oi');
    const result = await send('1');

    expect(result.outcome).toBe(CONVERSATION_OUTCOME.PRESENTED);
    expect(repository.row.currentNodeId).toBe('produto');
    expect(channel.sent.at(-1)).toEqual({ kind: 'text', body: 'Qual produto te interessa?' });
  });

  test('grava a resposta no contexto e se despede quando o fluxo acaba', async () => {
    await send('oi');
    await send('Conhecer produtos');
    const result = await send('Ada CRM');

    expect(result.outcome).toBe(CONVERSATION_OUTCOME.COMPLETED);
    expect(repository.row.context.produto).toBe('Ada CRM');
    expect(repository.row.currentNodeId).toBeNull();
    expect(channel.sent.at(-1)).toEqual({ kind: 'text', body: CONVERSATION_MESSAGE.CLOSING });
  });

  test('reapresenta o no na primeira resposta fora do fluxo', async () => {
    await send('oi');
    const result = await send('quero saber o preco do dolar');

    expect(result.outcome).toBe(CONVERSATION_OUTCOME.FALLBACK);
    expect(channel.sent.at(-2)).toEqual({ kind: 'text', body: CONVERSATION_MESSAGE.FALLBACK });
    expect(channel.sent.at(-1)).toEqual({ kind: 'list', body: 'Como posso ajudar?' });
    expect(repository.row.mode).toBe(SESSION_MODE.BOT);
  });

  test('chama uma pessoa na segunda resposta fora do fluxo, sem improvisar', async () => {
    await send('oi');
    await send('quero saber o preco do dolar');
    const result = await send('e a cotacao do euro?');

    expect(result.outcome).toBe(CONVERSATION_OUTCOME.HANDED_OFF);
    expect(repository.row.mode).toBe(SESSION_MODE.HUMAN);
    expect(repository.row.humanRequestedAt).not.toBeNull();
    expect(channel.sent.at(-1)).toEqual({ kind: 'text', body: CONVERSATION_MESSAGE.HANDOFF });
  });

  test('no de acao entrega a conversa e o bot nao manda despedida por cima', async () => {
    await send('oi');
    const result = await send('Falar com alguem');

    expect(result.outcome).toBe(CONVERSATION_OUTCOME.HANDED_OFF);
    expect(repository.row.mode).toBe(SESSION_MODE.HUMAN);
    expect(channel.sent.at(-1)).toEqual({ kind: 'text', body: CONVERSATION_MESSAGE.HANDOFF });
  });

  test('com a conversa em atendimento humano o bot fica em silencio', async () => {
    repository.row = { ...repository.row, mode: SESSION_MODE.HUMAN };

    const result = await send('oi');

    expect(result.outcome).toBe(CONVERSATION_OUTCOME.HUMAN);
    expect(channel.sent).toHaveLength(0);
  });

  test('"sair" encerra com a despedida configurada em vez de cair no fallback', async () => {
    await send('oi');
    const result = await send('sair');

    expect(result.outcome).toBe(CONVERSATION_OUTCOME.COMPLETED);
    expect(channel.sent.at(-1)).toEqual({ kind: 'text', body: FAREWELL_MESSAGE });
    expect(repository.row.currentNodeId).toBeNull();
    expect(repository.row.mode).toBe(SESSION_MODE.BOT);
  });

  test('depois de encerrar, a proxima mensagem recomeca do menu', async () => {
    await send('oi');
    await send('sair');
    const result = await send('oi de novo');

    expect(result.outcome).toBe(CONVERSATION_OUTCOME.PRESENTED);
    expect(channel.sent.at(-1)).toEqual({ kind: 'list', body: 'Como posso ajudar?' });
  });

  test('acento, caixa e pontuacao nao impedem o comando', async () => {
    await send('oi');
    const result = await send('Tchau!');

    expect(result.outcome).toBe(CONVERSATION_OUTCOME.COMPLETED);
    expect(channel.sent.at(-1)).toEqual({ kind: 'text', body: FAREWELL_MESSAGE });
  });

  test('"menu" volta ao inicio de uma pergunta de texto livre', async () => {
    await send('oi');
    await send('Conhecer produtos');
    const result = await send('menu');

    expect(result.outcome).toBe(CONVERSATION_OUTCOME.PRESENTED);
    expect(repository.row.currentNodeId).toBe('menu');
    expect(repository.row.context.produto).toBeUndefined();
  });

  test('"atendente" chama uma pessoa sem gastar as tentativas de fallback', async () => {
    await send('oi');
    const result = await send('atendente');

    expect(result.outcome).toBe(CONVERSATION_OUTCOME.HANDED_OFF);
    expect(repository.row.mode).toBe(SESSION_MODE.HUMAN);
    expect(repository.row.context._fallbackCount).toBeUndefined();
  });

  test('opcao desenhada no grafo vence a palavra do comando global', async () => {
    await send('oi');
    const result = await send('produtos');

    expect(result.outcome).toBe(CONVERSATION_OUTCOME.PRESENTED);
    expect(repository.row.currentNodeId).toBe('produto');
  });

  test('sem despedida configurada o encerramento usa a mensagem padrao', async () => {
    const silent = new AdvanceConversationUseCase({
      sessions: asSessionRepository(repository),
      getFlowGraph: fakeGetFlowGraph({ [ATENDIMENTO_GRAPH.key]: ATENDIMENTO_GRAPH }),
      interpreter: new FlowInterpreter(),
      requestHandoff: new RequestHandoffUseCase({ sessions: asSessionRepository(repository), companyId: COMPANY_ID }),
      settings: fakeSettings('   '),
      companyId: COMPANY_ID,
      startState: 'start',
    });

    await send('oi');
    const result = await silent.execute({ whatsappNumber: WHATSAPP_NUMBER, text: 'sair', channel });

    expect(result.outcome).toBe(CONVERSATION_OUTCOME.COMPLETED);
    expect(channel.sent.at(-1)).toEqual({ kind: 'text', body: CONVERSATION_MESSAGE.CLOSING });
  });

  test('"menu" nao repergunta o nome que o cliente ja deu', async () => {
    const named = new AdvanceConversationUseCase({
      sessions: asSessionRepository(repository),
      getFlowGraph: fakeGetFlowGraph({ [NOME_PRIMEIRO_GRAPH.key]: NOME_PRIMEIRO_GRAPH }),
      interpreter: new FlowInterpreter(),
      requestHandoff: new RequestHandoffUseCase({ sessions: asSessionRepository(repository), companyId: COMPANY_ID }),
      settings: fakeSettings(),
      companyId: COMPANY_ID,
      startState: 'start',
    });
    const speak = (text: string): Promise<{ outcome: string }> =>
      named.execute({ whatsappNumber: WHATSAPP_NUMBER, text, channel });

    await speak('oi');
    await speak('Anderson');
    const result = await speak('menu');

    expect(result.outcome).toBe(CONVERSATION_OUTCOME.PRESENTED);
    expect(repository.row.currentNodeId).toBe('menu');
    expect(repository.row.context.leadName).toBe('Anderson');
    expect(channel.sent.at(-1)).toEqual({ kind: 'list', body: 'Como posso ajudar?' });
  });

  test('fluxo publicado ausente vira atendimento humano, e nao conversa morta', async () => {
    const orphan = new AdvanceConversationUseCase({
      sessions: asSessionRepository(repository),
      getFlowGraph: fakeGetFlowGraph({}),
      interpreter: new FlowInterpreter(),
      requestHandoff: new RequestHandoffUseCase({ sessions: asSessionRepository(repository), companyId: COMPANY_ID }),
      settings: fakeSettings(),
      companyId: COMPANY_ID,
      startState: 'start',
    });

    const result = await orphan.execute({ whatsappNumber: WHATSAPP_NUMBER, text: 'oi', channel });

    expect(result.outcome).toBe(CONVERSATION_OUTCOME.HANDED_OFF);
    expect(repository.row.mode).toBe(SESSION_MODE.HUMAN);
  });
});
