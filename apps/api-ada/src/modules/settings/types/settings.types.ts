/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export type BotMessages = {
  readonly welcomeMessage: string;
  readonly farewellMessage: string;
};

export type TemplateSettings = {
  readonly templateName: string;
  readonly templateLanguage: string;
  readonly variables: readonly string[];
};

export type SaveBotMessagesParams = {
  readonly companyId: string;
  readonly messages: BotMessages;
  readonly agentId: string;
  readonly ipAddress?: string;
};

export type SaveTemplateSettingsParams = {
  readonly companyId: string;
  readonly settings: TemplateSettings;
  readonly agentId: string;
  readonly ipAddress?: string;
};

export type CreateTemplateInput = {
  readonly name: string;
  readonly category: 'MARKETING' | 'UTILITY';
  readonly language: string;
  readonly headerType: 'NONE' | 'TEXT';
  /** Vazio significa ausente: a Meta recusa componente declarado sem conteudo. */
  readonly headerText: string;
  readonly bodyText: string;
  readonly footerText: string;
};

export type CreateWhatsAppTemplateParams = {
  readonly input: CreateTemplateInput;
  readonly agentId: string;
  readonly ipAddress?: string;
};

export type CreateWhatsAppTemplateResult = {
  readonly shortId: string;
  readonly status: string;
};
