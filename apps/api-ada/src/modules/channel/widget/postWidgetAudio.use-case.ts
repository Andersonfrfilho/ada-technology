/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { AUDIO_LANGUAGE_HINT } from '@/modules/channel/widget/widget.constant';
import {
  WidgetAudioNotUnderstoodError,
  WidgetAudioUnavailableError,
  toWidgetAudioError,
} from '@/modules/channel/widget/widget.error';
import type {
  PostWidgetAudioDependencies,
  PostWidgetAudioParams,
  PostWidgetMessageResult,
} from '@/modules/channel/widget/types/widget.types';

/**
 * Nota de voz do visitante do site.
 *
 * A transcricao acontece aqui, e nao no navegador, porque a chave do provedor nao sai do servidor.
 * O texto reconhecido entra na conversa como fala do visitante — daquele ponto em diante o fluxo
 * nao sabe (nem precisa saber) que a resposta veio falada.
 */
export class PostWidgetAudioUseCase {
  constructor(private readonly dependencies: PostWidgetAudioDependencies) {}

  async execute({ sessionId, audio }: PostWidgetAudioParams): Promise<PostWidgetMessageResult> {
    const { transcriber, postMessage, extractLeadSignals } = this.dependencies;

    if (!transcriber) throw new WidgetAudioUnavailableError();

    // Unico try do caso de uso, e ele nao trata nada: so troca o erro do provedor pelo erro de
    // dominio equivalente, para o visitante receber "espere um pouco" no lugar de "erro interno".
    const transcription = await transcriber
      .transcribe({
        buffer: audio.buffer,
        mimeType: audio.mimeType,
        languageHint: AUDIO_LANGUAGE_HINT,
      })
      .catch((error: unknown) => {
        throw toWidgetAudioError(error);
      });

    const text = transcription.text.trim();
    // Texto vazio e resultado legitimo do engine (audio em silencio), nao falha de infraestrutura.
    if (!text) throw new WidgetAudioNotUnderstoodError();

    const result = await postMessage.execute({ sessionId, text });

    // O que o visitante falou solto costuma trazer mais contexto do que a pergunta pediu; a extracao
    // aproveita isso sem interromper a conversa se o modelo estiver fora do ar.
    await extractLeadSignals.execute({ sessionId, text });

    return result;
  }
}
