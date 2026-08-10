/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/**
 * Rotulo do alvo na trilha de auditoria: o que exatamente mudou dentro das configuracoes.
 *
 * Vai na metadata, nunca em `targetId` — a coluna e UUID, e configuracao nao tem um.
 */
export const SETTINGS_SCOPE = {
  BOT_MESSAGES: 'bot_messages',
  TEMPLATE: 'template',
} as const;

export type SettingsScope = (typeof SETTINGS_SCOPE)[keyof typeof SETTINGS_SCOPE];

export const BOT_MESSAGE_MAX_LENGTH = 1_000;

export const TEMPLATE_NAME_MAX_LENGTH = 512;
export const TEMPLATE_LANGUAGE_MAX_LENGTH = 10;
export const TEMPLATE_VARIABLE_MAX_LENGTH = 200;
export const TEMPLATE_VARIABLES_MAX_COUNT = 10;

export const TEMPLATE_BODY_MAX_LENGTH = 1_024;
export const TEMPLATE_HEADER_MAX_LENGTH = 60;
export const TEMPLATE_FOOTER_MAX_LENGTH = 60;

export const DEFAULT_TEMPLATE_LANGUAGE = 'pt_BR';
