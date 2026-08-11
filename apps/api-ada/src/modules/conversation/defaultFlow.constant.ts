/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { FLOW_ACTION_KIND, type FlowGraphData } from '@adatechnology/meta-whatsapp-contracts';

import { DEFAULT_FLOW_KEY } from '@/modules/conversation/conversation.constant';
import { LEAD_CONTEXT_KEY } from '@/shared/constants/domain.constant';

/**
 * O grafo que o bot fala enquanto ninguem editou nada pelo painel.
 *
 * Nao e configuracao de infraestrutura: e o texto que o cliente le. Fica em codigo porque a base
 * precisa nascer com alguma conversa publicada — sem grafo, `AdvanceConversationUseCase` entrega
 * toda mensagem para uma pessoa, e o bot passa a nao existir. A partir da primeira edicao no
 * painel, a versao do banco manda; este arquivo so serve de ponto de partida.
 */
const NODE_ID = {
  MENU: 'menu_inicio',
  ATENDIMENTO: 'produto_atendimento',
  DADOS: 'produto_dados',
  INTEGRACOES: 'produto_integracoes',
  NOME: 'pergunta_nome',
  CONTATO: 'pergunta_contato',
  HANDOFF: 'acao_handoff',
} as const;

const OPTION_ID = {
  ATENDIMENTO: 'atendimento',
  DADOS: 'dados',
  INTEGRACOES: 'integracoes',
  PESSOA: 'pessoa',
  FALAR: 'falar',
  VOLTAR: 'voltar',
} as const;

const CONTEXT_KEY = LEAD_CONTEXT_KEY;

const CONTINUE_QUESTION = 'Quer falar com alguém do time sobre isso?';

/**
 * Duas opcoes: o presenter manda como botao, e botao corta o titulo em 20 caracteres.
 *
 * O emoji entra em todo botao de resposta rapida e conta no orcamento — nesta lista ele ja consome
 * dois dos vinte. Rotulo mais longo nao degrada: a Graph API recusa a mensagem inteira.
 */
const CONTINUE_OPTIONS: [string, string][] = [
  [OPTION_ID.FALAR, '✅ Sim, quero falar'],
  [OPTION_ID.VOLTAR, '🔙 Ver outra opção'],
];

const CONTINUE_NEXT = {
  byAnswer: { [OPTION_ID.FALAR]: NODE_ID.NOME, [OPTION_ID.VOLTAR]: NODE_ID.MENU },
  default: NODE_ID.HANDOFF,
} as const;

const CHOICE_FALLBACK = 'Essa eu não sei responder 😅 — escolha uma das opções e eu te mostro.';

/**
 * `contextKey` no no de produto guarda o interesse.
 *
 * A resposta do menu vira `leadInterest` no contexto da sessao, que o atendente le na aba de
 * contexto do painel — assim quem assume a conversa ja sabe do que o cliente veio falar.
 */
export const DEFAULT_FLOW_GRAPH: FlowGraphData = {
  key: DEFAULT_FLOW_KEY,
  label: 'Atendimento Ada',
  startNodeId: NODE_ID.MENU,
  version: 1,
  nodes: {
    [NODE_ID.MENU]: {
      id: NODE_ID.MENU,
      type: 'menu',
      contextKey: CONTEXT_KEY.INTEREST,
      directMessage: 'Oi! 👋 Aqui é o assistente da *Ada Technology*.',
      question: 'Sobre o que você quer saber?',
      fallbackMessage: CHOICE_FALLBACK,
      // Quatro opcoes: passa do teto de botao e sai como lista, onde o titulo cabe em 24.
      options: [
        [OPTION_ID.ATENDIMENTO, '💬 Atendimento WhatsApp'],
        [OPTION_ID.DADOS, '📊 Dashboards e dados'],
        [OPTION_ID.INTEGRACOES, '🔗 Automações e APIs'],
        [OPTION_ID.PESSOA, '🙋 Falar com o time'],
      ],
      next: {
        byAnswer: {
          [OPTION_ID.ATENDIMENTO]: NODE_ID.ATENDIMENTO,
          [OPTION_ID.DADOS]: NODE_ID.DADOS,
          [OPTION_ID.INTEGRACOES]: NODE_ID.INTEGRACOES,
          [OPTION_ID.PESSOA]: NODE_ID.HANDOFF,
        },
        default: NODE_ID.HANDOFF,
      },
    },

    [NODE_ID.ATENDIMENTO]: {
      id: NODE_ID.ATENDIMENTO,
      type: 'question',
      questionType: 'choice',
      directMessage:
        '💬 *Plataforma de Atendimento WhatsApp*\n\n'
        + 'O bot roda o fluxo real do seu negócio e chama uma pessoa quando precisa. Vários '
        + 'atendentes na mesma linha oficial da Meta, com histórico completo das conversas.\n\n'
        + '_Mensagem ativa sai por template aprovado._',
      question: CONTINUE_QUESTION,
      fallbackMessage: CHOICE_FALLBACK,
      options: CONTINUE_OPTIONS,
      next: CONTINUE_NEXT,
    },

    [NODE_ID.DADOS]: {
      id: NODE_ID.DADOS,
      type: 'question',
      questionType: 'choice',
      directMessage:
        '📊 *Dashboards e Inteligência de Dados*\n\n'
        + 'Os dados da operação viram painel com os indicadores que importam, relatórios '
        + 'recorrentes e alerta quando algo sai da curva.',
      question: CONTINUE_QUESTION,
      fallbackMessage: CHOICE_FALLBACK,
      options: CONTINUE_OPTIONS,
      next: CONTINUE_NEXT,
    },

    [NODE_ID.INTEGRACOES]: {
      id: NODE_ID.INTEGRACOES,
      type: 'question',
      questionType: 'choice',
      directMessage:
        '🔗 *Automações e Integrações*\n\n'
        + 'Conectamos os sistemas que sua equipe já usa, do CRM ao ERP, por API REST e webhooks '
        + '— e o trabalho manual repetitivo sai da rotina.',
      question: CONTINUE_QUESTION,
      fallbackMessage: CHOICE_FALLBACK,
      options: CONTINUE_OPTIONS,
      next: CONTINUE_NEXT,
    },

    [NODE_ID.NOME]: {
      id: NODE_ID.NOME,
      type: 'question',
      questionType: 'text',
      contextKey: CONTEXT_KEY.NAME,
      question: 'Combinado! 🙌 Como podemos te chamar?',
      next: NODE_ID.CONTATO,
    },

    [NODE_ID.CONTATO]: {
      id: NODE_ID.CONTATO,
      type: 'question',
      questionType: 'text',
      contextKey: CONTEXT_KEY.CONTACT,
      question: '📩 E qual o melhor e-mail ou telefone para retorno?',
      next: NODE_ID.HANDOFF,
    },

    // Sem `next`: no de handoff que aponta para frente faz o fluxo seguir falando depois de ja
    // ter entregue a conversa para uma pessoa.
    [NODE_ID.HANDOFF]: {
      id: NODE_ID.HANDOFF,
      type: 'action',
      actionKind: FLOW_ACTION_KIND.HANDOFF,
    },
  },
};
