/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import {
  LEAD_SIGNALS_CONTEXT_KEY,
  LEAD_SIGNALS_MIN_TEXT_LENGTH,
  LEAD_SIGNALS_PROMPT,
  leadSignalsSchema,
} from '@/modules/conversation/leadSignals.constant';
import type {
  ExtractLeadSignalsDependencies,
  ExtractLeadSignalsParams,
} from '@/modules/conversation/types/conversation.types';
import { logger } from '@/shared/logger';

const SOURCE = 'ExtractLeadSignalsUseCase';

/**
 * Le a fala solta do visitante e guarda o que ela revela sobre a empresa dele.
 *
 * Existe porque o fluxo pergunta o minimo — nome, contato, interesse — e o resto o cliente conta
 * sozinho, principalmente por audio: "sou o financeiro de uma transportadora de 40 caminhoes e o
 * atendimento nao para de perder mensagem" traz porte, cargo, segmento e dor em uma frase. Perguntar
 * tudo isso viraria formulario, e formulario no chat e onde a conversa morre.
 *
 * Nada aqui bloqueia a conversa: falha de modelo, JSON torto ou timeout somem num warn. O passo do
 * fluxo ja aconteceu antes desta chamada.
 */
export class ExtractLeadSignalsUseCase {
  constructor(private readonly dependencies: ExtractLeadSignalsDependencies) {}

  async execute({ sessionId, text }: ExtractLeadSignalsParams): Promise<void> {
    if (text.trim().length < LEAD_SIGNALS_MIN_TEXT_LENGTH) return;

    try {
      const signals = await this.infer(text);
      if (!signals || Object.keys(signals).length === 0) return;

      const { sessions, companyId } = this.dependencies;
      const current = await sessions.getContext(companyId, sessionId);
      const previous = current?.context[LEAD_SIGNALS_CONTEXT_KEY];
      const merged = { ...(typeof previous === 'object' && previous !== null ? previous : {}), ...signals };

      await sessions.patchContext(companyId, sessionId, { [LEAD_SIGNALS_CONTEXT_KEY]: merged });
    } catch (error) {
      // O meta nao leva o texto: e conteudo de mensagem de cliente, que nao vai para log em nivel nenhum.
      logger.warn({
        message: 'Falha ao extrair sinais do lead',
        source: SOURCE,
        meta: { sessionId, reason: error instanceof Error ? error.name : 'unknown' },
      });
    }
  }

  private async call(text: string): Promise<string> {
    const { apiKey, model, baseUrl, timeoutMs } = this.dependencies;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: LEAD_SIGNALS_PROMPT },
          { role: 'user', content: text },
        ],
      }),
    });

    if (!response.ok) throw new Error(`groq responded ${response.status}`);

    const body: unknown = await response.json();
    const content = readContent(body);
    if (!content) throw new Error('groq response has no content');

    return content;
  }

  /** Saida de modelo e entrada nao confiavel: o zod e o que impede um campo inventado de virar contexto. */
  private async infer(text: string): Promise<Record<string, unknown> | undefined> {
    if (!this.dependencies.apiKey) return undefined;

    const parsed = leadSignalsSchema.safeParse(JSON.parse(await this.call(text)));

    return parsed.success ? parsed.data : undefined;
  }
}

function readContent(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null || !('choices' in body)) return undefined;

  const [choice] = Array.isArray(body.choices) ? body.choices : [];
  const message: unknown = typeof choice === 'object' && choice !== null && 'message' in choice ? choice.message : undefined;
  const content: unknown =
    typeof message === 'object' && message !== null && 'content' in message ? message.content : undefined;

  return typeof content === 'string' ? content : undefined;
}
