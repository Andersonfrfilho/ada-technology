/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import {
  TranscriptionRateLimitError,
  isTranscriptionError,
} from '@adatechnology/audio-transcription-provider';

import { DomainError } from '@/shared/errors/AppError';
import { ERROR_CODES } from '@/shared/errors/codes';

const NOT_FOUND = 404;
const BAD_REQUEST = 400;
const UNPROCESSABLE = 422;
const TOO_MANY_REQUESTS = 429;
const BAD_GATEWAY = 502;
const SERVICE_UNAVAILABLE = 503;

/** Sem `Retry-After` do provedor, o visitante ainda precisa de um numero para esperar. */
export const AUDIO_DEFAULT_RETRY_AFTER_SECONDS = 30;

/**
 * Id fora do formato do widget.
 *
 * Responde 404 de proposito: as sessoes de widget e de WhatsApp dividem a mesma tabela, e um erro
 * que distinguisse "formato invalido" de "nao existe" transformaria estas rotas publicas num
 * verificador de numero de telefone.
 */
export class WidgetSessionNotFoundError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.conversation.NOT_FOUND,
      message: 'Conversa nao encontrada',
      statusCode: NOT_FOUND,
    });
  }
}

/** Sem engine de transcricao configurado a rota nao existe na pratica — e o widget esconde o microfone. */
export class WidgetAudioUnavailableError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.channel.WIDGET_AUDIO_UNAVAILABLE,
      message: 'Transcricao de audio nao esta disponivel',
      statusCode: SERVICE_UNAVAILABLE,
    });
  }
}

export class WidgetAudioInvalidError extends DomainError {
  constructor(reason: string) {
    super({
      code: ERROR_CODES.channel.WIDGET_AUDIO_INVALID,
      message: `Audio invalido: ${reason}`,
      statusCode: BAD_REQUEST,
    });
  }
}

/**
 * Audio chegou e foi transcrito, mas nao sobrou texto — silencio, ruido ou fala fora de alcance.
 *
 * Nao e 500: nada falhou. O visitante precisa saber que o audio nao virou pergunta, e o widget
 * transforma este codigo no convite para escrever.
 */
export class WidgetAudioNotUnderstoodError extends DomainError {
  constructor() {
    super({
      code: ERROR_CODES.channel.WIDGET_AUDIO_NOT_UNDERSTOOD,
      message: 'Nao foi possivel entender o audio',
      statusCode: UNPROCESSABLE,
    });
  }
}

/**
 * Cota do provedor estourada — o audio estava perfeito, a janela e que fechou.
 *
 * O `retryAfterSeconds` vai no contexto porque o filtro de excecao o transforma no header
 * `Retry-After`: sem ele o visitante so ve "deu errado" e tenta de novo no mesmo segundo, queimando
 * a cota que ja estava no fim.
 */
export class WidgetAudioBusyError extends DomainError {
  constructor(retryAfterSeconds: number) {
    super({
      code: ERROR_CODES.channel.WIDGET_AUDIO_BUSY,
      message: 'Transcricao de audio temporariamente indisponivel',
      statusCode: TOO_MANY_REQUESTS,
      context: { retryAfterSeconds },
    });
  }
}

/** O engine falhou por conta propria: nem o visitante errou, nem o servidor caiu. */
export class WidgetAudioFailedError extends DomainError {
  constructor(engine: string) {
    super({
      code: ERROR_CODES.channel.WIDGET_AUDIO_FAILED,
      message: 'Nao foi possivel transcrever o audio agora',
      statusCode: BAD_GATEWAY,
      context: { engine },
    });
  }
}

/**
 * Traduz a falha do provedor no erro de dominio equivalente.
 *
 * A conversao vive na fronteira de proposito: sem ela, um 429 do Groq chega ao filtro global como
 * erro desconhecido e vira 500 generico — e o visitante recebe "erro interno" para uma situacao em
 * que bastava esperar meio minuto ou escrever a mensagem.
 */
export function toWidgetAudioError(error: unknown): unknown {
  if (error instanceof TranscriptionRateLimitError) {
    return new WidgetAudioBusyError(error.retryAfterSeconds ?? AUDIO_DEFAULT_RETRY_AFTER_SECONDS);
  }

  if (isTranscriptionError(error)) return new WidgetAudioFailedError(error.engine);

  return error;
}
