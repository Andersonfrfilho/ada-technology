/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { randomBytes } from 'node:crypto';

/**
 * A sessao do widget mora na mesma tabela da sessao de WhatsApp, cuja chave e
 * `whatsapp_number varchar(20)`. Um UUID tem 36 caracteres e nao caberia, entao o id do visitante
 * e `w` + 16 hex = 17. Opaco de proposito: a chave nunca deve carregar dado pessoal.
 */
export const WIDGET_SESSION_PREFIX = 'w';
const WIDGET_SESSION_RANDOM_BYTES = 8;

export function createWidgetSessionId(): string {
  return `${WIDGET_SESSION_PREFIX}${randomBytes(WIDGET_SESSION_RANDOM_BYTES).toString('hex')}`;
}

/** Acima disto nao e mais pergunta de visitante; o grafo tambem nao tem no que case com um texto assim. */
export const WIDGET_MESSAGE_MAX_LENGTH = 1_000;

export const WIDGET_TRANSCRIPT_DEFAULT_LIMIT = 50;
export const WIDGET_TRANSCRIPT_MAX_LIMIT = 100;

/**
 * O formato do id, como texto, para quem precisa dele fora do JavaScript.
 *
 * A tela de Clientes filtra canal no `where` do Postgres, e o operador `~` de la le a mesma sintaxe
 * de expressao regular. Duas descricoes do mesmo formato divergiriam em silencio: o filtro passaria
 * a devolver lista vazia sem nada quebrar.
 */
export const WIDGET_SESSION_ID_PATTERN = `^${WIDGET_SESSION_PREFIX}[0-9a-f]{${WIDGET_SESSION_RANDOM_BYTES * 2}}$`;

export function isWidgetSessionId(value: string): boolean {
  return new RegExp(WIDGET_SESSION_ID_PATTERN).test(value);
}
