/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { MessageRow } from '@adatechnology/meta-whatsapp-module';

/**
 * A janela mais recente da conversa, em ordem cronologica.
 *
 * O `listMessages` do modulo ordena do mais antigo para o mais novo e corta pelo limite, entao numa
 * conversa longa ele devolve o comeco do dialogo — o oposto do que painel e visitante precisam ver.
 * Por isso as duas telas consultam a tabela que o modulo exporta em vez do use-case dele.
 */
export type TranscriptRepositoryInterface = {
  listByConversation(params: ListTranscriptMessagesParams): Promise<MessageRow[]>;
};

export type ListTranscriptMessagesParams = {
  readonly companyId: string;
  readonly sessionId: string;
  readonly limit: number;
  /** `createdAt` da mensagem mais antiga ja carregada: pagina para tras sem repetir o que a tela tem. */
  readonly before?: string;
};
