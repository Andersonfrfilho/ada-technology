/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { createMetaWhatsAppModule, SseHub } from '@adatechnology/meta-whatsapp-module';
import { WhatsAppTemplateProvider } from '@adatechnology/meta-whatsapp-provider';

import { RedisCache } from '@/infra/cache/RedisCache';
import { RedisNonceStore } from '@/infra/cache/RedisNonceStore';
import { environment } from '@/infra/config/environment';
import { database } from '@/infra/database/client';
import { RedisRelay } from '@/infra/realtime/RedisRelay';
import { AuthenticateAgentUseCase } from '@/modules/agent/authenticateAgent.use-case';
import { DrizzleAgentRepository } from '@/modules/agent/DrizzleAgentRepository';
import { RedisRefreshTokenStore } from '@/modules/agent/RedisRefreshTokenStore';
import { RefreshAgentSessionUseCase } from '@/modules/agent/refreshAgentSession.use-case';
import { SignOutAgentUseCase } from '@/modules/agent/signOutAgent.use-case';
import { RecordAuditLogUseCase } from '@/modules/audit/recordAuditLog.use-case';
import { TranscribedWhatsAppChannel } from '@/modules/channel/whatsapp/TranscribedWhatsAppChannel';
import type { WhatsAppMessageHandlers } from '@/modules/channel/whatsapp/types/whatsapp.types';
import { createWhatsAppMessageHook } from '@/modules/channel/whatsapp/whatsappMessageHook';
import { PostWidgetMessageUseCase } from '@/modules/channel/widget/postWidgetMessage.use-case';
import { StartWidgetSessionUseCase } from '@/modules/channel/widget/startWidgetSession.use-case';
import { WidgetChannelAdapter } from '@/modules/channel/widget/WidgetChannelAdapter';
import { AdvanceConversationUseCase } from '@/modules/conversation/advanceConversation.use-case';
import { registerConversationFlowActions } from '@/modules/conversation/registerFlowActions';
import { RequestHandoffUseCase } from '@/modules/conversation/requestHandoff.use-case';
import { CreateFlowGraphUseCase } from '@/modules/flow/createFlowGraph.use-case';
import { DeleteFlowGraphUseCase } from '@/modules/flow/deleteFlowGraph.use-case';
import { SaveFlowGraphUseCase } from '@/modules/flow/saveFlowGraph.use-case';
import type { FlowGraphPort } from '@/modules/flow/types/flow.types';
import { DrizzlePanelConversationRepository } from '@/modules/panel/DrizzlePanelConversationRepository';
import { DrizzlePanelLeadRepository } from '@/modules/panel/DrizzlePanelLeadRepository';
import { ExportConversationTranscriptUseCase } from '@/modules/panel/exportConversationTranscript.use-case';
import { RedisRealtimeTicketStore } from '@/modules/panel/RedisRealtimeTicketStore';
import { ReleaseConversationUseCase } from '@/modules/panel/releaseConversation.use-case';
import { ResolveConversationUseCase } from '@/modules/panel/resolveConversation.use-case';
import { SendPanelMessageUseCase } from '@/modules/panel/sendPanelMessage.use-case';
import { TakeoverConversationUseCase } from '@/modules/panel/takeoverConversation.use-case';
import { CreateWhatsAppTemplateUseCase } from '@/modules/settings/createWhatsAppTemplate.use-case';
import { MetaTemplateCatalog } from '@/modules/settings/MetaTemplateCatalog';
import { SaveBotMessagesUseCase } from '@/modules/settings/saveBotMessages.use-case';
import { SaveTemplateSettingsUseCase } from '@/modules/settings/saveTemplateSettings.use-case';
import { DrizzleTranscriptRepository } from '@/modules/shared/DrizzleTranscriptRepository';

// Estado inicial de sessao nova. O modulo nao conhece a maquina de estados do produto.
export const START_STATE = 'start';

export const realtime = new SseHub(new RedisRelay());

/**
 * Credenciais da Meta quando o canal esta desligado.
 *
 * O modulo monta o provider da Graph API no construtor, sem ponto de injecao, entao precisa
 * receber alguma coisa. Nao e brecha de fail-closed: com `WHATSAPP_ENABLED=false` as rotas de
 * webhook nao sao registradas e nada roteia para este canal — o env ja recusa subir com o canal
 * ligado e segredo ausente.
 */
const DISABLED_WHATSAPP_CREDENTIAL = 'disabled';

/**
 * Preenchido logo abaixo, assim que os use-cases existem.
 *
 * O hook e obrigatoriamente declarado na mesma chamada que devolve o modulo do qual os use-cases
 * dependem. O `let` e a unica forma de fechar esse ciclo sem o host montar o modulo duas vezes.
 */
let whatsappMessageHandlers: WhatsAppMessageHandlers | undefined;

export const metaWhatsApp = createMetaWhatsAppModule({
  db: database as never,
  config: {
    phoneNumberId: environment.WHATSAPP_PHONE_NUMBER_ID || DISABLED_WHATSAPP_CREDENTIAL,
    accessToken: environment.WHATSAPP_ACCESS_TOKEN || DISABLED_WHATSAPP_CREDENTIAL,
    webhookVerifyToken: environment.WHATSAPP_WEBHOOK_VERIFY_TOKEN || DISABLED_WHATSAPP_CREDENTIAL,
    appSecret: environment.WHATSAPP_APP_SECRET || DISABLED_WHATSAPP_CREDENTIAL,
    wabaId: environment.WHATSAPP_BUSINESS_ACCOUNT_ID,
    baseUrl: environment.WHATSAPP_GRAPH_BASE_URL,
  },
  nonceStore: new RedisNonceStore(),
  startState: START_STATE,
  features: {
    flowEngine: true,
    // Ligado com o Redis compartilhado: o grafo e lido a cada mensagem, e o cache por processo
    // serviria versoes diferentes do mesmo fluxo depois de uma publicacao.
    flowGraphCache: true,
  },
  providers: {
    cache: new RedisCache(),
    realtime,
  },
  hooks: {
    onMessageReceived: createWhatsAppMessageHook({
      resolveHandlers: () => {
        if (!whatsappMessageHandlers) {
          throw new Error('Bot de atendimento ainda nao montado: mensagem recebida antes do boot terminar.');
        }

        return whatsappMessageHandlers;
      },
    }),
  },
});

export const widgetChannel = new WidgetChannelAdapter({
  logMessage: metaWhatsApp.conversations.log,
  companyId: environment.ADA_COMPANY_ID,
  startState: START_STATE,
});

// `flows` e opcional no tipo porque o motor de fluxo e uma feature do modulo. Aqui ele esta ligado
// logo acima; se um dia deixar de vir, o bot nao teria o que responder — falhar no boot expoe isso
// no deploy, e nao numa conversa em silencio.
const flows = metaWhatsApp.flows;
if (!flows) {
  throw new Error('Motor de fluxo do meta-whatsapp indisponivel: o bot de atendimento nao pode subir.');
}

export const flowGraphs = flows;

const sessions = metaWhatsApp.conversations.repository;

export const requestHandoff = new RequestHandoffUseCase({
  sessions,
  companyId: environment.ADA_COMPANY_ID,
});

export const advanceConversation = new AdvanceConversationUseCase({
  sessions,
  getFlowGraph: flows.get,
  interpreter: flows.interpreter,
  requestHandoff,
  companyId: environment.ADA_COMPANY_ID,
  startState: START_STATE,
});

registerConversationFlowActions({ registry: flows.interpreter, requestHandoff });

export const transcribedWhatsAppChannel = new TranscribedWhatsAppChannel({
  channel: metaWhatsApp.channel,
  logMessage: metaWhatsApp.conversations.log,
  companyId: environment.ADA_COMPANY_ID,
  startState: START_STATE,
});

// So o bot fala por aqui. `SendMessageUseCase` guarda o adapter cru que recebeu no construtor do
// modulo, entao a mensagem que o atendente manda pelo painel continua sendo gravada uma vez so.
whatsappMessageHandlers = { advanceConversation, requestHandoff, channel: transcribedWhatsAppChannel };

export const startWidgetSession = new StartWidgetSessionUseCase({
  advanceConversation,
  channel: widgetChannel,
});

export const postWidgetMessage = new PostWidgetMessageUseCase({
  advanceConversation,
  channel: widgetChannel,
  logMessage: metaWhatsApp.conversations.log,
  companyId: environment.ADA_COMPANY_ID,
  startState: START_STATE,
});

export const recordAuditLog = new RecordAuditLogUseCase();
export const agentRepository = new DrizzleAgentRepository();
const refreshTokens = new RedisRefreshTokenStore();

export const authenticateAgent = new AuthenticateAgentUseCase({
  agents: agentRepository,
  refreshTokens,
  recordAudit: recordAuditLog,
});

export const refreshAgentSession = new RefreshAgentSessionUseCase({
  agents: agentRepository,
  refreshTokens,
});

export const signOutAgent = new SignOutAgentUseCase({ refreshTokens, recordAudit: recordAuditLog });

export const panelConversations = new DrizzlePanelConversationRepository();
export const transcriptMessages = new DrizzleTranscriptRepository();
export const panelLeads = new DrizzlePanelLeadRepository();
export const realtimeTickets = new RedisRealtimeTicketStore();

export const resolvePanelConversation = new ResolveConversationUseCase({
  conversations: panelConversations,
  companyId: environment.ADA_COMPANY_ID,
});

export const sendPanelMessage = new SendPanelMessageUseCase({
  resolveConversation: resolvePanelConversation,
  sendWhatsAppMessage: metaWhatsApp.conversations.send,
  logMessage: metaWhatsApp.conversations.log,
  companyId: environment.ADA_COMPANY_ID,
  startState: START_STATE,
});

export const takeoverConversation = new TakeoverConversationUseCase({
  resolveConversation: resolvePanelConversation,
  takeover: metaWhatsApp.conversations.takeover,
  recordAudit: recordAuditLog,
  companyId: environment.ADA_COMPANY_ID,
});

export const releaseConversation = new ReleaseConversationUseCase({
  resolveConversation: resolvePanelConversation,
  release: metaWhatsApp.conversations.release,
  recordAudit: recordAuditLog,
  companyId: environment.ADA_COMPANY_ID,
});

export const exportConversationTranscript = new ExportConversationTranscriptUseCase({
  resolveConversation: resolvePanelConversation,
  messages: transcriptMessages,
  recordAudit: recordAuditLog,
  companyId: environment.ADA_COMPANY_ID,
});

export const saveBotMessages = new SaveBotMessagesUseCase({
  settings: metaWhatsApp.settings,
  recordAuditLog,
});

export const saveTemplateSettings = new SaveTemplateSettingsUseCase({
  settings: metaWhatsApp.settings,
  recordAuditLog,
});

/**
 * O motor de fluxo do pacote, reapresentado como o contrato que os use cases de edicao esperam.
 *
 * `delete` e palavra reservada mais adiante no encadeamento, e o adaptador de quatro linhas evita
 * espalhar `flows.delete.execute` por dentro do dominio.
 */
const flowGraphPort: FlowGraphPort = {
  get: (params) => flows.get.execute(params),
  save: (params) => flows.save.execute(params),
  create: (params) => flows.create.execute(params),
  remove: (params) => flows.delete.execute(params),
};

export const saveFlowGraph = new SaveFlowGraphUseCase({ flows: flowGraphPort, recordAuditLog });
export const createFlowGraph = new CreateFlowGraphUseCase({ flows: flowGraphPort, recordAuditLog });
export const deleteFlowGraph = new DeleteFlowGraphUseCase({ flows: flowGraphPort, recordAuditLog });

/**
 * Sem WhatsApp ligado o catalogo nasce sem provider e responde 503 em vez de lista vazia.
 *
 * O `wabaId` e checado a parte porque a Graph API separa a conta de negocio do numero: da para
 * mandar mensagem sem saber o WABA, mas nao da para listar nem criar template.
 */
const templateProvider =
  environment.WHATSAPP_ENABLED && environment.WHATSAPP_BUSINESS_ACCOUNT_ID
    ? new WhatsAppTemplateProvider({
        accessToken: environment.WHATSAPP_ACCESS_TOKEN,
        wabaId: environment.WHATSAPP_BUSINESS_ACCOUNT_ID,
        baseUrl: environment.WHATSAPP_GRAPH_BASE_URL,
      })
    : undefined;

export const templateCatalog = new MetaTemplateCatalog({
  ...(templateProvider ? { provider: templateProvider } : {}),
});

export const createWhatsAppTemplate = new CreateWhatsAppTemplateUseCase({
  catalog: templateCatalog,
  recordAuditLog,
});

export const container = {
  realtime,
  metaWhatsApp,
  recordAuditLog,
  agentRepository,
  authenticateAgent,
  refreshAgentSession,
  signOutAgent,
  widgetChannel,
  transcribedWhatsAppChannel,
  advanceConversation,
  requestHandoff,
  startWidgetSession,
  postWidgetMessage,
  panelConversations,
  transcriptMessages,
  panelLeads,
  realtimeTickets,
  resolvePanelConversation,
  sendPanelMessage,
  takeoverConversation,
  releaseConversation,
  exportConversationTranscript,
  saveBotMessages,
  saveTemplateSettings,
  flowGraphs,
  saveFlowGraph,
  createFlowGraph,
  deleteFlowGraph,
  templateCatalog,
  createWhatsAppTemplate,
} as const;

export type Container = typeof container;
