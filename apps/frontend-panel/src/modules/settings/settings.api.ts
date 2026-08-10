/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type {
  BotMessages,
  TemplateSettings,
  WhatsAppCreateTemplateState,
  WhatsAppTemplateSummary,
} from '@adatechnology/conversations-ui';

import { HTTP_METHOD, PANEL_PATH } from '@/modules/shared/http/http.constant';
import { panelRequest } from '@/modules/shared/http/panelHttpClient';
import type { CreatedTemplate } from '@/modules/settings/types/settings.types';

export async function fetchBotMessages(): Promise<BotMessages> {
  return panelRequest<BotMessages>({ path: PANEL_PATH.BOT_MESSAGES });
}

export async function saveBotMessages(messages: BotMessages): Promise<void> {
  await panelRequest<BotMessages>({
    path: PANEL_PATH.BOT_MESSAGES,
    method: HTTP_METHOD.PUT,
    body: messages,
  });
}

export async function fetchTemplateSettings(): Promise<TemplateSettings> {
  return panelRequest<TemplateSettings>({ path: PANEL_PATH.TEMPLATE_SETTINGS });
}

export async function saveTemplateSettings(settings: TemplateSettings): Promise<void> {
  await panelRequest<TemplateSettings>({
    path: PANEL_PATH.TEMPLATE_SETTINGS,
    method: HTTP_METHOD.PUT,
    body: settings,
  });
}

export async function listTemplates(): Promise<WhatsAppTemplateSummary[]> {
  const templates = await panelRequest<WhatsAppTemplateSummary[]>({ path: PANEL_PATH.TEMPLATES });

  return [...templates];
}

export async function createTemplate(input: WhatsAppCreateTemplateState): Promise<CreatedTemplate> {
  return panelRequest<CreatedTemplate>({
    path: PANEL_PATH.TEMPLATES,
    method: HTTP_METHOD.POST,
    body: input,
  });
}
