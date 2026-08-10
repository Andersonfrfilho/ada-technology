/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { z } from 'zod';

import {
  BOT_MESSAGE_MAX_LENGTH,
  DEFAULT_TEMPLATE_LANGUAGE,
  TEMPLATE_BODY_MAX_LENGTH,
  TEMPLATE_FOOTER_MAX_LENGTH,
  TEMPLATE_HEADER_MAX_LENGTH,
  TEMPLATE_LANGUAGE_MAX_LENGTH,
  TEMPLATE_NAME_MAX_LENGTH,
  TEMPLATE_VARIABLE_MAX_LENGTH,
  TEMPLATE_VARIABLES_MAX_COUNT,
} from '@/modules/settings/settings.constant';

export const botMessagesSchema = z.object({
  welcomeMessage: z.string().max(BOT_MESSAGE_MAX_LENGTH),
  farewellMessage: z.string().max(BOT_MESSAGE_MAX_LENGTH),
});

export const templateSettingsSchema = z.object({
  templateName: z.string().max(TEMPLATE_NAME_MAX_LENGTH),
  templateLanguage: z.string().max(TEMPLATE_LANGUAGE_MAX_LENGTH).default(DEFAULT_TEMPLATE_LANGUAGE),
  variables: z.array(z.string().max(TEMPLATE_VARIABLE_MAX_LENGTH)).max(TEMPLATE_VARIABLES_MAX_COUNT),
});

/**
 * O nome do template e a chave publica dele na Meta, que so aceita minusculas, digitos e `_`.
 *
 * Validar aqui poupa uma ida a Graph API para receber de volta um erro que ja se sabia — e evita que
 * um nome recusado la apareca no painel como falha de integracao.
 */
const templateNameSchema = z
  .string()
  .min(1)
  .max(TEMPLATE_NAME_MAX_LENGTH)
  .regex(/^[a-z0-9_]+$/);

export const createTemplateSchema = z
  .object({
    name: templateNameSchema,
    category: z.enum(['MARKETING', 'UTILITY']),
    language: z.string().max(TEMPLATE_LANGUAGE_MAX_LENGTH).default(DEFAULT_TEMPLATE_LANGUAGE),
    headerType: z.enum(['NONE', 'TEXT']).default('NONE'),
    headerText: z.string().max(TEMPLATE_HEADER_MAX_LENGTH).default(''),
    bodyText: z.string().min(1).max(TEMPLATE_BODY_MAX_LENGTH),
    footerText: z.string().max(TEMPLATE_FOOTER_MAX_LENGTH).default(''),
  })
  // Cabecalho de texto sem texto sobe para a Meta como componente vazio e volta rejeitado.
  .refine((value) => value.headerType !== 'TEXT' || value.headerText.length > 0, {
    path: ['headerText'],
    message: 'headerText e obrigatorio quando headerType e TEXT',
  });
