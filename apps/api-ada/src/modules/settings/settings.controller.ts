/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { environment } from '@/infra/config/environment';
import { metaWhatsApp, saveBotMessages, saveTemplateSettings } from '@/infra/container';
import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { readJsonBody } from '@/infra/http/requestBody';
import { jsonData } from '@/infra/http/responses';
import { AUTH_REQUIREMENT, HTTP_METHOD, requireAgent, type Route } from '@/infra/http/router';
import { botMessagesSchema, templateSettingsSchema } from '@/modules/settings/settings.schema';

const BOT_MESSAGES_PATH = '/v1/panel/bot-messages';
const TEMPLATE_SETTINGS_PATH = '/v1/panel/template-settings';

const companyId = environment.ADA_COMPANY_ID;

/**
 * Ler e escrever a configuracao caem em rotas separadas de proposito.
 *
 * `SettingsRepository.save` aceita atualizacao parcial, entao mensagens do bot e template convivem na
 * mesma linha sem uma tela apagar o campo da outra ao salvar.
 */
const readBotMessagesRoute: Route = {
  method: HTTP_METHOD.GET,
  path: BOT_MESSAGES_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_READ,
  handler: async () => {
    const settings = await metaWhatsApp.settings.get(companyId);

    return jsonData({
      welcomeMessage: settings.welcomeMessage,
      farewellMessage: settings.farewellMessage,
    });
  },
};

const saveBotMessagesRoute: Route = {
  method: HTTP_METHOD.PUT,
  path: BOT_MESSAGES_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async (context) => {
    const messages = botMessagesSchema.parse(await readJsonBody(context.request));
    const { agentId } = requireAgent(context);

    const saved = await saveBotMessages.execute({
      companyId,
      messages,
      agentId,
      ipAddress: context.clientAddress,
    });

    return jsonData(saved);
  },
};

const readTemplateSettingsRoute: Route = {
  method: HTTP_METHOD.GET,
  path: TEMPLATE_SETTINGS_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_READ,
  handler: async () => {
    const settings = await metaWhatsApp.settings.get(companyId);

    return jsonData({
      templateName: settings.templateName,
      templateLanguage: settings.templateLanguage,
      variables: settings.templateVariables,
    });
  },
};

const saveTemplateSettingsRoute: Route = {
  method: HTTP_METHOD.PUT,
  path: TEMPLATE_SETTINGS_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async (context) => {
    const settings = templateSettingsSchema.parse(await readJsonBody(context.request));
    const { agentId } = requireAgent(context);

    const saved = await saveTemplateSettings.execute({
      companyId,
      settings,
      agentId,
      ipAddress: context.clientAddress,
    });

    return jsonData(saved);
  },
};

export const panelSettingsRoutes: readonly Route[] = [
  readBotMessagesRoute,
  saveBotMessagesRoute,
  readTemplateSettingsRoute,
  saveTemplateSettingsRoute,
];
