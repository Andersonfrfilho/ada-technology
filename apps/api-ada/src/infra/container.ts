/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import {
  authProvidersConfigSchema,
  buildLocalOnlyAuthProvidersConfig,
  type AuthProviderInterface,
  type LocalCredentials,
} from '@ada/user-sdk';
import type { LoggerPort as CatalogLoggerPort } from '@adatechnology/catalog-contracts';
import { createS3ProductImageStorage } from '@adatechnology/catalog-image-storage-provider';
import { createCatalogModule } from '@adatechnology/catalog-module';
import { MetaCatalogProvider } from '@adatechnology/meta-catalog-provider';
import type { LoggerPort as SchedulingLoggerPort } from '@adatechnology/scheduling-contracts';
import { createSchedulingModule } from '@adatechnology/scheduling-module';
import { EMAIL_ATTACHMENT_MAX_BYTES } from '@adatechnology/notification-contracts';
import { createObjectStorageProvider } from '@adatechnology/object-storage-provider';
import { createMetaWhatsAppModule, SseHub } from '@adatechnology/meta-whatsapp-module';
import type { LoggerPort as NotificationLoggerPort } from '@adatechnology/notification-contracts';
import { createLoginAlertNotifier } from '@/modules/notification/loginAlertNotifier';
import { UploadNotificationAttachmentUseCase } from '@/modules/notification/uploadNotificationAttachment.use-case';
import {
  createNotificationModule,
  createNotificationWorker,
} from '@adatechnology/notification-module';
import { WhatsAppTemplateProvider } from '@adatechnology/meta-whatsapp-provider';
import type {
  LoggerPort as UserLoggerPort,
  PasswordResetRequestedEvent,
} from '@adatechnology/user-contracts';
import { createUserModule } from '@adatechnology/user-module';

import { createBullMqQueue } from '@adatechnology/notification-module/queue/bullmq';
import { Queue, Worker } from 'bullmq';

import { redis } from '@/infra/cache/redisClient';
import { RedisCache } from '@/infra/cache/RedisCache';
import { RedisNonceStore } from '@/infra/cache/RedisNonceStore';
import { createGroqTranscriber, GROQ_BASE_URL } from '@adatechnology/audio-transcription-provider';

import { environment } from '@/infra/config/environment';
import { database } from '@/infra/database/client';
import { createConfiguredEmailDriver } from '@/infra/email/emailDriver';
import { RedisRelay } from '@/infra/realtime/RedisRelay';
import { ACCESS_TOKEN_AUDIENCE, ACCESS_TOKEN_ISSUER } from '@/modules/agent/agent.constant';
import { AuthenticateAgentUseCase } from '@/modules/agent/authenticateAgent.use-case';
import { DrizzleAgentRepository } from '@/modules/agent/DrizzleAgentRepository';
import { CreateAgentUseCase } from '@/modules/agent/createAgent.use-case';
import { createLocalAgentAuthProvider } from '@/modules/agent/localAuthProvider';
import { RedisRefreshTokenStore } from '@/modules/agent/RedisRefreshTokenStore';
import { RefreshAgentSessionUseCase } from '@/modules/agent/refreshAgentSession.use-case';
import { SignOutAgentUseCase } from '@/modules/agent/signOutAgent.use-case';
import { ACTOR_TYPE, AUDIT_ACTION, AUDIT_TARGET } from '@/modules/audit/audit.constant';
import { RecordAuditLogUseCase } from '@/modules/audit/recordAuditLog.use-case';
import {
  CATALOG_CURRENCY,
  CATALOG_LOCALE,
  CATALOG_META_SYNC,
  PRODUCT_IMAGE_MAX_BYTES,
} from '@/modules/catalog/catalog.constant';
import { createCatalogChannelPort } from '@/modules/catalog/CatalogChannelPort';
import { MetaCatalogSyncAdapter } from '@/modules/catalog/MetaCatalogSyncAdapter';
import { TranscribedWhatsAppChannel } from '@/modules/channel/whatsapp/TranscribedWhatsAppChannel';
import type { WhatsAppMessageHandlers } from '@/modules/channel/whatsapp/types/whatsapp.types';
import { createWhatsAppMessageHook } from '@/modules/channel/whatsapp/whatsappMessageHook';
import { PostWidgetAudioUseCase } from '@/modules/channel/widget/postWidgetAudio.use-case';
import { PostWidgetMessageUseCase } from '@/modules/channel/widget/postWidgetMessage.use-case';
import { AUDIO_LANGUAGE_HINT } from '@/modules/channel/widget/widget.constant';
import { ExtractLeadSignalsUseCase } from '@/modules/conversation/extractLeadSignals.use-case';
import { LEAD_SIGNALS_TIMEOUT_MS } from '@/modules/conversation/leadSignals.constant';
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
import {
  NOTIFICATION_DEFAULT_LOCALE,
  NOTIFICATION_DEFAULT_TIMEZONE,
  NOTIFICATION_QUEUE_NAME,
} from '@/modules/notification/notification.constant';
import { notificationAuthResolver } from '@/modules/notification/notificationAuthResolver';
import { notificationRecipientResolver } from '@/modules/notification/notificationRecipientResolver';
import { createPasswordResetNotifier } from '@/modules/notification/passwordResetNotifier';
import { NOTIFICATION_TEMPLATE_VARIABLES } from '@/modules/notification/passwordResetTemplate.constant';
import { SeedNotificationTemplatesUseCase } from '@/modules/notification/seedNotificationTemplates.use-case';
import { registerSchedulingFlowActions } from '@/modules/scheduling/registerSchedulingFlowActions';
import { SchedulingAgenda } from '@/modules/scheduling/SchedulingAgenda';
import { ProvisionSchedulingResourcesUseCase } from '@/modules/scheduling/provisionSchedulingResources.use-case';
import { SCHEDULING_MODULE_CONFIG } from '@/modules/scheduling/scheduling.constant';
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
import { SimulateInboundMessageUseCase } from '@/modules/simulation/simulateInboundMessage.use-case';
import { WhatsAppInboundSimulator } from '@/modules/simulation/WhatsAppInboundSimulator';
import { RedisUserRefreshTokenStore } from '@/modules/user/RedisUserRefreshTokenStore';
import { logger } from '@/shared/logger';

// Estado inicial de sessao nova. O modulo nao conhece a maquina de estados do produto.
export const START_STATE = 'start';

const CATALOG_SOURCE = 'modules.catalog';
const SCHEDULING_SOURCE = 'modules.scheduling';
const USER_SOURCE = 'modules.user';
const NOTIFICATION_SOURCE = 'modules.notification';

/** O modulo loga por assinatura propria; a mascara e o nivel continuam sendo os da Ada. */
const catalogLogger: CatalogLoggerPort = {
  debug: (message, meta) => logger.debug({ message, source: CATALOG_SOURCE, ...(meta ? { meta } : {}) }),
  info: (message, meta) => logger.info({ message, source: CATALOG_SOURCE, ...(meta ? { meta } : {}) }),
  warn: (message, meta) => logger.warn({ message, source: CATALOG_SOURCE, ...(meta ? { meta } : {}) }),
  error: (message, meta) => logger.error({ message, source: CATALOG_SOURCE, ...(meta ? { meta } : {}) }),
};

/** Mesma razao do logger do catalogo: assinatura do pacote, mascara e nivel da Ada. */
const schedulingLogger: SchedulingLoggerPort = {
  debug: (message, meta) => logger.debug({ message, source: SCHEDULING_SOURCE, ...(meta ? { meta } : {}) }),
  info: (message, meta) => logger.info({ message, source: SCHEDULING_SOURCE, ...(meta ? { meta } : {}) }),
  warn: (message, meta) => logger.warn({ message, source: SCHEDULING_SOURCE, ...(meta ? { meta } : {}) }),
  error: (message, meta) => logger.error({ message, source: SCHEDULING_SOURCE, ...(meta ? { meta } : {}) }),
};

/** Mesma razao do logger do catalogo: assinatura do pacote, mascara e nivel da Ada. */
const userLogger: UserLoggerPort = {
  debug: (message, meta) => logger.debug({ message, source: USER_SOURCE, ...(meta ? { meta } : {}) }),
  info: (message, meta) => logger.info({ message, source: USER_SOURCE, ...(meta ? { meta } : {}) }),
  warn: (message, meta) => logger.warn({ message, source: USER_SOURCE, ...(meta ? { meta } : {}) }),
  error: (message, meta) => logger.error({ message, source: USER_SOURCE, ...(meta ? { meta } : {}) }),
};

/** Mesma razao do logger do catalogo: assinatura do pacote, mascara e nivel da Ada. */
const notificationLogger: NotificationLoggerPort = {
  debug: (message, meta) => logger.debug({ message, source: NOTIFICATION_SOURCE, ...(meta ? { meta } : {}) }),
  info: (message, meta) => logger.info({ message, source: NOTIFICATION_SOURCE, ...(meta ? { meta } : {}) }),
  warn: (message, meta) => logger.warn({ message, source: NOTIFICATION_SOURCE, ...(meta ? { meta } : {}) }),
  error: (message, meta) => logger.error({ message, source: NOTIFICATION_SOURCE, ...(meta ? { meta } : {}) }),
};

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
    // Vitrine no chat so existe com catalogo publicado na Meta: sem o id, a action nem e
    // registrada e o no de produto passa em silencio.
    ...(environment.META_CATALOG_ID ? { catalogId: environment.META_CATALOG_ID } : {}),
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
    catalog: createCatalogChannelPort({
      resolveLookup: () => catalogModule.lookup,
      companyId: environment.ADA_COMPANY_ID,
    }),
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
    // Vitrine que nao saiu deixa o cliente sem resposta num no automatico, e o modulo segue a
    // conversa de proposito. Quem tem de gritar e o host.
    onFlowProductListError: (error, details) => {
      logger.error({
        message: 'Vitrine de produtos nao enviada',
        source: CATALOG_SOURCE,
        meta: {
          flowKey: details.flowKey,
          nodeId: details.nodeId,
          reason: error instanceof Error ? error.message : String(error),
        },
      });
    },
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
  settings: metaWhatsApp.settings,
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

/**
 * Transcricao e capacidade opcional: sem chave, nao ha objeto — e a rota de audio responde 503.
 *
 * O mesmo `undefined` desce ate o widget pela ausencia do microfone, entao o visitante nunca ve um
 * botao que a instalacao nao sabe atender.
 */
const audioTranscriber = environment.GROQ_API_KEY
  ? createGroqTranscriber({
    apiKey: environment.GROQ_API_KEY,
    model: environment.GROQ_TRANSCRIPTION_MODEL,
    languageHint: AUDIO_LANGUAGE_HINT,
  })
  : undefined;

export const extractLeadSignals = new ExtractLeadSignalsUseCase({
  sessions: metaWhatsApp.conversations.repository,
  companyId: environment.ADA_COMPANY_ID,
  apiKey: environment.GROQ_API_KEY,
  model: environment.GROQ_MODEL,
  baseUrl: GROQ_BASE_URL,
  timeoutMs: LEAD_SIGNALS_TIMEOUT_MS,
});

export const postWidgetAudio = new PostWidgetAudioUseCase({
  transcriber: audioTranscriber,
  postMessage: postWidgetMessage,
  extractLeadSignals,
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

/**
 * `@adatechnology/user-module`, rodando em paralelo ao `agents`/`@ada/user-sdk` acima (Fase A da
 * migracao — `delightful-noodling-hare.md` §4.3). O store de refresh e proprio: o do `agents` tem
 * outro contrato e indexa pelo token cru, enquanto o modulo entrega o sha256 (ver
 * `RedisUserRefreshTokenStore`).
 *
 * `issuer`/`audience` repetem os do `agent/accessToken.ts` de proposito: enquanto os dois sistemas
 * convivem, o token de um precisa passar pelo `authenticateRequest` do outro — sem isso as rotas
 * novas de escopo `user`/`admin` responderiam 401 antes de o modulo rodar.
 *
 * `providers.email` vem de `EMAIL_DRIVER` (ver `infra/email/emailDriver.ts`): vazio desliga o envio
 * por ausencia e sobra o hook `onPasswordResetRequested` para quem quiser notificar por conta
 * propria.
 */
const emailDriver = createConfiguredEmailDriver();

export const userModule = await createUserModule({
  db: database as never,
  config: {
    tenancy: { mode: 'single', defaultCompanyId: environment.ADA_COMPANY_ID },
    accessToken: {
      secret: environment.PANEL_JWT_SECRET,
      expiresInSeconds: environment.PANEL_ACCESS_TOKEN_TTL_MINUTES * 60,
      issuer: ACCESS_TOKEN_ISSUER,
      audience: ACCESS_TOKEN_AUDIENCE,
    },
    passwordReset: { resetUrlTemplate: environment.PANEL_RESET_URL_TEMPLATE },
  },
  providers: {
    refreshTokenStore: new RedisUserRefreshTokenStore(),
    /**
     * **Sem `email` de proposito.** O `RequestPasswordResetUseCase` envia por conta propria sempre
     * que este provider existe, e SO DEPOIS dispara `onPasswordResetRequested` — com os dois
     * ligados, a pessoa recebia dois e-mails: o texto fixo do pacote e o template do painel.
     *
     * A capacidade e por ausencia: tirando o provider, o `user-module` responde `hasEmail: false`,
     * para de enviar, e o unico caminho passa a ser o hook (ver `passwordResetNotifier.ts`). O
     * driver continua existindo — ele agora e do `notification-module`, e do fallback de
     * recuperacao de conta.
     */
    logger: userLogger,
  },
  hooks: {
    /**
     * So trilha de auditoria. O AVISO de acesso sai do `agent.controller.ts`, no login de verdade.
     *
     * O painel autentica por `authenticateAgent` direto — nada passa por aqui nesta fase, entao um
     * aviso ligado neste hook ficaria dormente. E ligar nos DOIS lugares, para o dia em que o
     * `user-module` assumir o login, faria a pessoa receber dois e-mails do mesmo acesso: e a mesma
     * duplicacao que o `providers.email` ja causou uma vez (ADR 0003).
     *
     * Quando o login migrar para o `user-module`, o disparo volta para ca e sai do controller — um
     * lugar de cada vez.
     */
    onLoginSucceeded: (event) =>
      recordAuditLog.execute({
        actorType: ACTOR_TYPE.AGENT,
        actorId: event.userId,
        action: AUDIT_ACTION.AGENT_SIGNED_IN,
        targetType: AUDIT_TARGET.AGENT,
        targetId: event.userId,
        ipAddress: event.ipAddress,
      }),
    // `LoginFailedEvent` nao carrega `userId` — defesa contra enumeracao de conta por desenho do
    // modulo, entao a trilha de auditoria de falha nao tem ator/alvo, so o IP.
    onLoginFailed: (event) =>
      recordAuditLog.execute({
        actorType: ACTOR_TYPE.AGENT,
        action: AUDIT_ACTION.AGENT_SIGN_IN_FAILED,
        targetType: AUDIT_TARGET.AGENT,
        ipAddress: event.ipAddress,
      }),
    /**
     * O e-mail de redefinicao passa a sair pelo `notification-module`, para a copy ser editavel
     * pelo painel. A funcao e declarada depois de `notificationModule` (mais abaixo neste arquivo)
     * e chega ate aqui por hoisting: o corpo dela so roda quando alguem pede o reset, muito depois
     * do boot terminar.
     */
    onPasswordResetRequested: (event) => notifyPasswordResetRequested(event),
  },
});

/**
 * Notificacao multicanal, montada ainda sem consumidor: nada no produto chama `sendNotification`
 * nesta entrega — o reset de senha continua saindo pelo `user-module`. O modulo sobe agora para as
 * rotas de template e de preferencia existirem antes de o fluxo migrar para elas.
 *
 * Fila em processo EXPLICITA, e nao a implicita do modulo: o `ada-technology` nao tem app de
 * worker, e um broker so acumularia job que ninguem consome. Mas a fila em processo tambem nao
 * entrega sozinha — ela guarda os jobs num backlog ate alguem registrar o consumidor. Por isso a
 * instancia e criada aqui e passada NAS DUAS pontas: para o modulo produzir, e para
 * `notificationWorker` consumir, logo abaixo. Deixar o modulo criar a dele internamente esconderia
 * a fila do host, e todo e-mail ficaria enfileirado para sempre.
 *
 * So o canal de e-mail, e ele e o mesmo objeto que o `user-module` recebe (ver
 * `infra/email/emailDriver.ts`): `EMAIL_DRIVER` vazio devolve `undefined` e o canal some por
 * ausencia, em vez de existir quebrado.
 */
/**
 * BullMQ sobre o Redis que ja existe, e nao a fila em memoria de antes.
 *
 * A fila em memoria perdia TODA entrega enfileirada em deploy, restart ou crash — em silencio. Com
 * o job no Redis ele sobrevive ao processo, e o consumidor o encontra ao subir. Com anexo isso
 * pesa mais: o envio passa a incluir um download, e a janela de perda aumenta.
 *
 * O `Worker` ganha conexao PROPRIA: ele bloqueia esperando job (`BRPOPLPUSH`), e uma conexao
 * bloqueada nao atende mais nenhum comando — reusar a de cima deixaria cache e rate limit mudos.
 *
 * Retencao, `attempts` e backoff sao do adaptador do pacote, que ja segue o `security.md` §6.
 */
const notificationQueueName = `${environment.PROJECT_NAME}-${environment.ENV}-${NOTIFICATION_QUEUE_NAME}`;

/** Exportada para o painel operacional montar em cima da MESMA fila que o modulo produz. */
export const notificationBullQueue = new Queue(notificationQueueName, { connection: redis });

/**
 * Fecha a fila. Obrigatorio em TODO comando de linha que importa este container.
 *
 * A `Queue` do BullMQ abre conexao propria com o Redis e segura o event loop — o mesmo problema que
 * o `SseHub` ja causava, e que o `closeRedis()` resolvia para ele. Sem fechar aqui, `flow:republish`
 * e o seed publicam o que tinham que publicar e NUNCA SAEM: o `deploy:pre` fica esperando, e o
 * deploy inteiro pendura sem erro nenhum no log.
 */
export function closeNotificationQueue(): Promise<void> {
  return notificationBullQueue.close();
}

const notificationQueue = createBullMqQueue({
  queue: notificationBullQueue,
  createWorker: (handler) =>
    new Worker(notificationQueueName, async (job) => handler(job.data), { connection: redis.duplicate() }),
});

export const notificationModule = createNotificationModule({
  db: database as never,
  config: {
    defaultLocale: NOTIFICATION_DEFAULT_LOCALE,
    defaultTimezone: NOTIFICATION_DEFAULT_TIMEZONE,
    suppressionHmacKey: environment.NOTIFICATION_SUPPRESSION_KEY,
    // O que o editor de template oferece como variavel, e o que o `upsert` aceita.
    templateVariables: NOTIFICATION_TEMPLATE_VARIABLES,
  },
  providers: {
    recipientResolver: notificationRecipientResolver,
    queue: notificationQueue,
    ...(emailDriver ? { channels: { email: emailDriver } } : {}),
    authContextResolver: notificationAuthResolver,
    logger: notificationLogger,
  },
});

/**
 * Quem tira o job da fila e chama o driver. Sem `start()`, a entrega nasce `queued` e morre ali.
 * O ciclo de vida (start/stop) e amarrado ao boot da API em `infra/index.ts`.
 */
export const notificationWorker = createNotificationWorker({
  module: notificationModule,
  queue: notificationQueue,
  logger: notificationLogger,
});

/**
 * Aviso de acesso a conta. Sem `PANEL_PASSWORD_CHANGE_URL` ele nao existe: capacidade por ausencia,
 * porque o texto termina mandando trocar a senha e precisa dizer onde.
 */
export const loginAlertNotifier = environment.PANEL_PASSWORD_CHANGE_URL
  ? createLoginAlertNotifier({
      module: notificationModule,
      companyId: environment.ADA_COMPANY_ID,
      passwordChangeUrl: environment.PANEL_PASSWORD_CHANGE_URL,
      logger: userLogger,
    })
  : undefined;

const passwordResetNotifier = createPasswordResetNotifier({
  module: notificationModule,
  companyId: environment.ADA_COMPANY_ID,
  ...(emailDriver ? { emailDriver } : {}),
  logger: userLogger,
});

export const seedNotificationTemplates = new SeedNotificationTemplatesUseCase(
  notificationModule,
  environment.ADA_COMPANY_ID,
);

/** Ponte para o hook do `user-module`, que e declarado antes deste ponto no arquivo. */
function notifyPasswordResetRequested(event: PasswordResetRequestedEvent): Promise<void> {
  return passwordResetNotifier(event);
}

/**
 * Config validada do `@ada/user-sdk`, hoje so com o provedor local — ponto de extensao para quando
 * um segundo provedor (OAuth2/OIDC) for implementado.
 */
/** Cadastro de atendente pelo painel — a alternativa ao seed por SSH. */
export const createAgent = new CreateAgentUseCase({ agents: agentRepository });

export const authProvidersConfig = authProvidersConfigSchema.parse(buildLocalOnlyAuthProvidersConfig());

/**
 * Mapa aditivo de provedores de auth. Os handlers de `agent.controller.ts` continuam chamando
 * `authenticateAgent` diretamente — nada no login em producao passa por aqui nesta entrega.
 */
export const authProviders: ReadonlyMap<string, AuthProviderInterface<LocalCredentials>> = new Map([
  ['local', createLocalAgentAuthProvider(authenticateAgent)],
]);

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

/**
 * Injetor do WhatsApp simulado, ausente quando o canal esta desligado.
 *
 * Sem segredo de app nao ha assinatura, e sem assinatura o webhook recusa — a capacidade some por
 * ausencia, e o painel nem oferece o canal.
 */
const whatsappInboundSimulator = environment.WHATSAPP_ENABLED
  ? new WhatsAppInboundSimulator({
    receiveWebhook: metaWhatsApp.webhook.receive,
    companyId: environment.ADA_COMPANY_ID,
    appSecret: environment.WHATSAPP_APP_SECRET,
    phoneNumberId: environment.WHATSAPP_PHONE_NUMBER_ID,
    businessAccountId: environment.WHATSAPP_BUSINESS_ACCOUNT_ID,
  })
  : undefined;

export const simulateInboundMessage = new SimulateInboundMessageUseCase({
  resolveConversation: resolvePanelConversation,
  postWidgetMessage,
  postWidgetAudio,
  recordAudit: recordAuditLog,
  ...(whatsappInboundSimulator ? { whatsapp: whatsappInboundSimulator } : {}),
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

/**
 * Publicacao na Meta so existe com catalogo e token — capacidade por ausencia.
 *
 * Sem eles o modulo sobe inteiro e o painel gerencia produto normalmente; o que fica desligado e
 * o espelhamento para o Commerce. E o inverso tambem vale: o modulo recusa subir se a config pedir
 * `metaSync` sem a porta, para o operador nao descobrir dias depois pelo item que nunca publica.
 */
export const catalogMetaSync =
  environment.META_CATALOG_ID && environment.META_CATALOG_ACCESS_TOKEN
    ? new MetaCatalogSyncAdapter(
        new MetaCatalogProvider({
          accessToken: environment.META_CATALOG_ACCESS_TOKEN,
          catalogId: environment.META_CATALOG_ID,
          wabaId: environment.WHATSAPP_BUSINESS_ACCOUNT_ID,
        }),
      )
    : undefined;

/**
 * Bucket ausente e upload de imagem ausente: o modulo nao publica a rota e o painel nao desenha o
 * campo de arquivo — quem nao tem storage segue digitando a URL da imagem, como antes.
 */
export const productImageBucket = environment.OBJECT_STORAGE_BUCKET
  ? {
      name: environment.OBJECT_STORAGE_BUCKET,
      storage: createObjectStorageProvider({
        endpoint: new URL(environment.OBJECT_STORAGE_ENDPOINT),
        region: environment.OBJECT_STORAGE_REGION,
        accessKeyId: environment.OBJECT_STORAGE_ACCESS_KEY_ID,
        secretAccessKey: environment.OBJECT_STORAGE_SECRET_ACCESS_KEY,
        // O MinIO local serve por caminho; o bucket do Railway, por subdominio. Quem sabe qual e o
        // ambiente e o ambiente.
        forcePathStyle: environment.OBJECT_STORAGE_FORCE_PATH_STYLE,
        healthCheckBucket: environment.OBJECT_STORAGE_BUCKET,
        maxObjectSizeBytes: PRODUCT_IMAGE_MAX_BYTES,
      }),
    }
  : undefined;

/**
 * Bucket dos anexos, PRIVADO e separado do de imagem de produto (ADR 0002).
 *
 * Reusa endpoint, regiao e credencial; so o bucket muda. `maxObjectSizeBytes` e o teto do contrato,
 * e nao o da imagem: o provider recusa antes de subir, e um teto de 5MB aqui reprovaria uma nota
 * fiscal legitima.
 */
export const notificationAttachmentUpload = environment.OBJECT_STORAGE_ATTACHMENT_BUCKET
  ? new UploadNotificationAttachmentUseCase({
      bucket: environment.OBJECT_STORAGE_ATTACHMENT_BUCKET,
      storage: createObjectStorageProvider({
        // Credencial propria quando o provedor emite uma por bucket (Railway); a compartilhada
        // quando ele usa uma so para todos (MinIO do compose).
        endpoint: new URL(environment.OBJECT_STORAGE_ATTACHMENT_ENDPOINT || environment.OBJECT_STORAGE_ENDPOINT),
        region: environment.OBJECT_STORAGE_REGION,
        accessKeyId:
          environment.OBJECT_STORAGE_ATTACHMENT_ACCESS_KEY_ID || environment.OBJECT_STORAGE_ACCESS_KEY_ID,
        secretAccessKey:
          environment.OBJECT_STORAGE_ATTACHMENT_SECRET_ACCESS_KEY || environment.OBJECT_STORAGE_SECRET_ACCESS_KEY,
        forcePathStyle: environment.OBJECT_STORAGE_FORCE_PATH_STYLE,
        healthCheckBucket: environment.OBJECT_STORAGE_ATTACHMENT_BUCKET,
        maxObjectSizeBytes: EMAIL_ATTACHMENT_MAX_BYTES,
      }),
    })
  : undefined;

export const productImageStorage = productImageBucket
  ? createS3ProductImageStorage({
      storage: productImageBucket.storage,
      bucket: productImageBucket.name,
      publicBaseUrl: environment.OBJECT_STORAGE_PUBLIC_BASE_URL,
    })
  : undefined;

export const catalogModule = createCatalogModule({
  db: database as never,
  config: {
    currency: CATALOG_CURRENCY,
    locale: CATALOG_LOCALE,
    // Estoque zerado tira o item do ar sozinho: quem vende pronta-entrega nao quer receber pedido
    // do que acabou, e corrigir a disponibilidade a mao sempre chega tarde.
    deriveAvailabilityFromInventory: true,
    ...(catalogMetaSync ? { metaSync: CATALOG_META_SYNC } : {}),
  },
  providers: {
    logger: catalogLogger,
    ...(catalogMetaSync ? { metaSync: catalogMetaSync } : {}),
    ...(productImageStorage ? { imageStorage: productImageStorage } : {}),
  },
});

/**
 * A agenda.
 *
 * Sem `calendarSync` de proposito: a capacidade e opcional por ausencia, e ligar o espelho no
 * Google e plugar o provider depois, sem tocar em nenhuma chamada. O relogio entra pela porta
 * para o teste nao depender do dia em que roda.
 */
export const schedulingModule = createSchedulingModule({
  db: database as never,
  config: SCHEDULING_MODULE_CONFIG,
  providers: {
    logger: schedulingLogger,
    clock: { now: () => new Date() },
  },
});

export const schedulingAgenda = new SchedulingAgenda(schedulingModule, environment.ADA_COMPANY_ID);

// Depois do modulo, e nao junto do resto do fluxo la em cima: a agenda so existe a partir daqui.
registerSchedulingFlowActions({ registry: flows.interpreter, agenda: schedulingAgenda });

export const provisionSchedulingResources = new ProvisionSchedulingResourcesUseCase(
  schedulingModule,
  agentRepository,
  environment.ADA_COMPANY_ID,
);

export const container = {
  realtime,
  metaWhatsApp,
  recordAuditLog,
  agentRepository,
  authenticateAgent,
  refreshAgentSession,
  signOutAgent,
  authProvidersConfig,
  authProviders,
  userModule,
  widgetChannel,
  transcribedWhatsAppChannel,
  advanceConversation,
  requestHandoff,
  startWidgetSession,
  postWidgetMessage,
  postWidgetAudio,
  extractLeadSignals,
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
  catalogModule,
  catalogMetaSync,
  schedulingModule,
  provisionSchedulingResources,
  schedulingAgenda,
  notificationModule,
} as const;

export type Container = typeof container;
