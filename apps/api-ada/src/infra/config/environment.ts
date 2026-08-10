/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { z } from 'zod';

const commaSeparatedList = z
  .string()
  .transform((value) => value.split(',').map((item) => item.trim()).filter(Boolean));

const booleanFromString = z
  .string()
  .transform((value) => value.toLowerCase() === 'true');

const environmentSchema = z
  .object({
    PROJECT_NAME: z.string().min(1),
    ENV: z.enum(['dev', 'test', 'staging', 'production']),
    NODE_ENV: z.enum(['development', 'test', 'production']),

    APP_NAME: z.string().min(1),
    API_PORT: z.coerce.number().int().positive(),
    API_PUBLIC_URL: z.string().url(),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),

    // O modulo do SDK e multiempresa por desenho; este produto atende uma empresa so (a propria
    // Ada). Fica em env, e nao numa constante, para o tenant nao virar literal espalhado no codigo.
    ADA_COMPANY_ID: z.string().uuid(),

    CORS_ALLOWED_ORIGINS: commaSeparatedList,
    WIDGET_ALLOWED_ORIGINS: commaSeparatedList,

    PANEL_JWT_SECRET: z.string().min(32),
    PANEL_ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().max(15),

    WHATSAPP_ENABLED: booleanFromString,
    WHATSAPP_PHONE_NUMBER_ID: z.string().default(''),
    WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().default(''),
    WHATSAPP_ACCESS_TOKEN: z.string().default(''),
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().default(''),
    WHATSAPP_APP_SECRET: z.string().default(''),
    WHATSAPP_GRAPH_BASE_URL: z.string().url(),

    INTENT_CLASSIFIER_ENABLED: booleanFromString,
    GROQ_API_KEY: z.string().default(''),
    GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  })
  // Fail-closed: canal habilitado sem segredo nao sobe, em vez de aceitar
  // webhook sem assinatura verificavel.
  .superRefine((value, context) => {
    if (!value.WHATSAPP_ENABLED) return;

    const requiredWhenEnabled = [
      'WHATSAPP_PHONE_NUMBER_ID',
      'WHATSAPP_ACCESS_TOKEN',
      'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
      'WHATSAPP_APP_SECRET',
    ] as const;

    for (const key of requiredWhenEnabled) {
      if (value[key].length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} e obrigatorio quando WHATSAPP_ENABLED=true`,
        });
      }
    }
  })
  .superRefine((value, context) => {
    if (value.INTENT_CLASSIFIER_ENABLED && value.GROQ_API_KEY.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['GROQ_API_KEY'],
        message: 'GROQ_API_KEY e obrigatorio quando INTENT_CLASSIFIER_ENABLED=true',
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

function loadEnvironment(): Environment {
  const parsed = environmentSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Variaveis de ambiente invalidas:\n${details}`);
  }

  return parsed.data;
}

export const environment = loadEnvironment();
