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
    // Template da URL de redefinicao de senha enviada por e-mail. Precisa conter o literal
    // `{token}` — o `user-module` substitui antes de disparar o hook `onPasswordResetRequested`.
    PANEL_RESET_URL_TEMPLATE: z.string().min(1),

    /**
     * Para onde o aviso de acesso manda quem NAO reconhece o login.
     *
     * Vazia desliga o aviso por ausencia — como o `EMAIL_DRIVER`. Sem essa URL o texto terminaria
     * em "troque a senha" sem dizer onde, e um aviso de seguranca sem saida e pior que nenhum.
     */
    PANEL_PASSWORD_CHANGE_URL: z.string().default(''),

    WHATSAPP_ENABLED: booleanFromString,
    WHATSAPP_PHONE_NUMBER_ID: z.string().default(''),
    WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().default(''),
    WHATSAPP_ACCESS_TOKEN: z.string().default(''),
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().default(''),
    WHATSAPP_APP_SECRET: z.string().default(''),
    WHATSAPP_GRAPH_BASE_URL: z.string().url(),

    // Catalogo nao e do WhatsApp: e objeto do Meta Commerce, e o mesmo id alimenta anuncio dinamico,
    // Instagram Shopping e Messenger. O WhatsApp so o consome. Callback URL e verify token sao
    // proprios; sem o verify token a rota nem existe — capacidade opcional e por ausencia, nao flag.
    META_CATALOG_ID: z.string().default(''),
    META_CATALOG_ACCESS_TOKEN: z.string().default(''),
    META_CATALOG_WEBHOOK_VERIFY_TOKEN: z.string().default(''),

    // Bucket S3-compativel para imagem de produto. Sem ele o modulo nao publica a rota de upload e
    // o painel nao desenha o campo — capacidade por ausencia. A URL publica e separada do endpoint
    // porque a Meta precisa buscar a imagem por uma URL estavel, e URL assinada expira.
    OBJECT_STORAGE_ENDPOINT: z.string().default(''),
    OBJECT_STORAGE_REGION: z.string().default('us-east-1'),
    OBJECT_STORAGE_ACCESS_KEY_ID: z.string().default(''),
    OBJECT_STORAGE_SECRET_ACCESS_KEY: z.string().default(''),
    OBJECT_STORAGE_BUCKET: z.string().default(''),
    OBJECT_STORAGE_PUBLIC_BASE_URL: z.string().default(''),
    // O bucket do Railway serve por subdominio; o MinIO do compose, por caminho.
    OBJECT_STORAGE_FORCE_PATH_STYLE: booleanFromString.default('true'),

    /**
     * Bucket PRIVADO dos anexos de notificacao, separado do de imagem de produto.
     *
     * O `OBJECT_STORAGE_BUCKET` e servido com leitura anonima porque a Meta precisa buscar imagem de
     * produto por URL estavel. Anexo e dado pessoal e sai por URL assinada de vida curta — dividir o
     * bucket seria vazamento por descuido (ver ADR 0002). Vazio desliga a rota de upload, e o painel
     * nao desenha o campo: capacidade por ausencia, como o `EMAIL_DRIVER`.
     *
     * Reusa endpoint, regiao e credencial do mesmo provedor; so o bucket muda.
     */
    OBJECT_STORAGE_ATTACHMENT_BUCKET: z.string().default(''),

    /**
     * Credencial PROPRIA do bucket de anexo, quando o provedor emite uma por bucket.
     *
     * O MinIO do compose usa uma credencial para todos os buckets, e ai estas ficam vazias e valem
     * as de cima. O Railway emite um par por bucket — descoberto criando o bucket de staging, com
     * `accessKeyId` diferente do de imagem de produto. Sem esta separacao, a chave do bucket publico
     * assinaria o bucket privado, e o `403` so apareceria no primeiro anexo.
     */
    OBJECT_STORAGE_ATTACHMENT_ENDPOINT: z.string().default(''),
    OBJECT_STORAGE_ATTACHMENT_ACCESS_KEY_ID: z.string().default(''),
    OBJECT_STORAGE_ATTACHMENT_SECRET_ACCESS_KEY: z.string().default(''),

    // Vazio desliga o envio por ausencia: o modulo de usuario nao recebe `providers.email` e o
    // pedido de redefinicao de senha so dispara o hook, sem mensagem.
    EMAIL_DRIVER: z.enum(['', 'smtp', 'resend', 'ses']).default(''),
    EMAIL_FROM: z.string().default(''),
    EMAIL_SMTP_URL: z.string().default(''),
    EMAIL_RESEND_API_KEY: z.string().default(''),
    EMAIL_SES_REGION: z.string().default('us-east-1'),
    /**
     * URL PUBLICA e absoluta do logo no cabecalho do e-mail. Vazia, o cabecalho cai na marca
     * tipografica — capacidade por ausencia, como o `EMAIL_DRIVER`. Data URI nao serve: Gmail e
     * Outlook descartam `src="data:"`, e o cabecalho sairia quebrado justamente nos dois clientes
     * que mais aparecem.
     */
    EMAIL_LOGO_URL: z.string().default(''),

    // Chave do HMAC que o notification-module usa para a lista de supressao: ela guarda o digest do
    // endereco, nunca o endereco em claro. Trocar a chave zera as supressoes existentes, entao ela
    // e de ambiente e nao rotaciona junto com segredo de sessao.
    NOTIFICATION_SUPPRESSION_KEY: z.string().min(32),

    INTENT_CLASSIFIER_ENABLED: booleanFromString,
    GROQ_API_KEY: z.string().default(''),
    GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
    GROQ_TRANSCRIPTION_MODEL: z.string().default('whisper-large-v3-turbo'),
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
  // Bucket meio configurado e pior que bucket ausente: a rota sobe e falha so quando o cliente
  // tenta enviar a foto. Ou tudo, ou nada.
  .superRefine((value, context) => {
    const storageKeys = [
      'OBJECT_STORAGE_ENDPOINT',
      'OBJECT_STORAGE_ACCESS_KEY_ID',
      'OBJECT_STORAGE_SECRET_ACCESS_KEY',
      'OBJECT_STORAGE_BUCKET',
      'OBJECT_STORAGE_PUBLIC_BASE_URL',
    ] as const;

    const filled = storageKeys.filter((key) => value[key].length > 0);
    if (filled.length === 0) return;

    for (const key of storageKeys) {
      if (value[key].length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} e obrigatorio quando o bucket de imagem esta configurado`,
        });
      }
    }

    for (const key of ['OBJECT_STORAGE_ENDPOINT', 'OBJECT_STORAGE_PUBLIC_BASE_URL'] as const) {
      if (value[key].length > 0 && !URL.canParse(value[key])) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} precisa ser uma URL valida`,
        });
      }
    }
  })
  // Bucket de anexo sem o resto do storage e rota que sobe e falha so no primeiro upload — o mesmo
  // caso que a regra do bucket de imagem evita, e pelo mesmo motivo.
  .superRefine((value, context) => {
    if (value.OBJECT_STORAGE_ATTACHMENT_BUCKET.length === 0) return;

    // Cada peca vem da credencial propria do anexo OU da compartilhada. Faltando nas duas, a rota
    // subiria e falharia so no primeiro upload — o caso que a regra do bucket de imagem evita.
    const resolved = {
      endpoint: value.OBJECT_STORAGE_ATTACHMENT_ENDPOINT || value.OBJECT_STORAGE_ENDPOINT,
      accessKeyId: value.OBJECT_STORAGE_ATTACHMENT_ACCESS_KEY_ID || value.OBJECT_STORAGE_ACCESS_KEY_ID,
      secretAccessKey:
        value.OBJECT_STORAGE_ATTACHMENT_SECRET_ACCESS_KEY || value.OBJECT_STORAGE_SECRET_ACCESS_KEY,
    } as const;

    for (const [field, resolvedValue] of Object.entries(resolved)) {
      if (resolvedValue.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['OBJECT_STORAGE_ATTACHMENT_BUCKET'],
          message: `sem ${field} do anexo nem o compartilhado, e OBJECT_STORAGE_ATTACHMENT_BUCKET esta configurado`,
        });
      }
    }
  })
  .superRefine((value, context) => {
    if (value.EMAIL_DRIVER === '') return;

    const requiredByDriver = {
      smtp: ['EMAIL_FROM', 'EMAIL_SMTP_URL'],
      resend: ['EMAIL_FROM', 'EMAIL_RESEND_API_KEY'],
      ses: ['EMAIL_FROM', 'EMAIL_SES_REGION'],
    } as const;

    for (const key of requiredByDriver[value.EMAIL_DRIVER]) {
      if (value[key].length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} e obrigatorio quando EMAIL_DRIVER=${value.EMAIL_DRIVER}`,
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
