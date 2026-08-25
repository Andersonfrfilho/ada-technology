/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/** Prefixo das rotas do modulo. Como no catalogo e na agenda, o painel e o unico consumidor. */
export const NOTIFICATION_BASE_PATH = '/v1/panel/notification';

/**
 * Escopo devolvido ao despachante do modulo para quem e admin do painel.
 *
 * As rotas de template e de politica de categoria sao `admin` e hoje nao declaram
 * `requiredScopes` — a barreira real e o `auth: ADMIN` da rota-ponte. O escopo viaja mesmo assim
 * para o dia em que o pacote declarar, sem o painel descobrir por 403 em producao.
 */
export const NOTIFICATION_ADMIN_SCOPE = 'notification:admin';

/** Idioma e fuso do produto, os mesmos que a agenda ja assume para o time daqui. */
export const NOTIFICATION_DEFAULT_LOCALE = 'pt-BR';
export const NOTIFICATION_DEFAULT_TIMEZONE = 'America/Sao_Paulo';

/**
 * Assunto e chave de template da redefinicao de senha.
 *
 * A categoria e o vocabulario que o painel mostra em "Roteamento"; a chave e o que o
 * `sendNotification` procura na tabela de templates. Ambas sao string estavel: elas entram no
 * historico de entrega e na politica de canal, e renomear depois quebra conversa em andamento
 * (`code-standart.md` §16 — literal repetido vira constante).
 */
export const NOTIFICATION_CATEGORY_AUTH = 'auth.password_reset';
export const NOTIFICATION_TEMPLATE_PASSWORD_RESET = 'auth.password_reset';

/**
 * Aviso de acesso a conta.
 *
 * Categoria SEPARADA da redefinicao de senha, e nao a mesma `auth.*`: sao decisoes de canal
 * diferentes. Redefinicao e recuperacao de acesso e precisa chegar; aviso de login e informativo, e
 * quem nao quiser pode desligar na aba de Roteamento sem afetar o outro. Categoria compartilhada
 * significaria desligar os dois juntos.
 */
export const NOTIFICATION_CATEGORY_LOGIN = 'auth.login_alert';
export const NOTIFICATION_TEMPLATE_LOGIN_ALERT = 'auth.login_alert';

/**
 * Anexo de e-mail.
 *
 * O teto e o do contrato (`EMAIL_ATTACHMENT_MAX_BYTES`, 25MB): Gmail e Outlook recusam acima, e o
 * SES conta o MIME ja em base64, que infla ~33%.
 */
export const NOTIFICATION_ATTACHMENT_FIELD = 'file';

/**
 * Lista fechada de tipos, e nao "tudo menos executavel".
 *
 * Bloquear por extensao perigosa e corrida perdida — `.scr`, `.hta`, `.iso` e o proximo formato que
 * alguem inventar. Aceitar o que o produto realmente anexa (documento fiscal, comprovante, planilha,
 * imagem) deixa a lista curta e o risco fechado por construcao.
 */
export const NOTIFICATION_ATTACHMENT_CONTENT_TYPES: readonly string[] = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/xml',
  'text/xml',
];

/**
 * Prefixo da chave no bucket. O nome do arquivo NAO entra na chave: `security.md` §7 proibe dado
 * pessoal em nome de chave, e "nota-fiscal-joao-silva.pdf" e dado pessoal. O nome original viaja no
 * corpo da resposta e volta na hora de assinar o download.
 */
export const NOTIFICATION_ATTACHMENT_KEY_PREFIX = 'notification-attachments';

/** Vida da URL assinada que o driver usa para baixar. Curta: ela e credencial de leitura. */
export const NOTIFICATION_ATTACHMENT_SIGNED_URL_SECONDS = 300;

/** A rota de upload do anexo. Fora do `basePath` do modulo: ela e do host, nao do pacote. */
export const NOTIFICATION_ATTACHMENT_UPLOAD_PATH = '/v1/notifications/attachments';

/**
 * Nome da fila no Redis.
 *
 * Prefixado pelo projeto e ambiente como todo recurso (`code-standart.md` §4): dev, staging e um
 * `docker compose` de outra pasta dividiriam o mesmo Redis e consumiriam o job um do outro.
 */
export const NOTIFICATION_QUEUE_NAME = 'notification-dispatch';
