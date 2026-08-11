/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { AudioTranscriber } from '@adatechnology/audio-transcription-provider';
import { TranscriptionError, TranscriptionRateLimitError } from '@adatechnology/audio-transcription-provider';
import { describe, expect, test } from 'bun:test';

import {
  AUDIO_DEFAULT_RETRY_AFTER_SECONDS,
  WidgetAudioBusyError,
  WidgetAudioFailedError,
} from '@/modules/channel/widget/widget.error';

import { resolveAnswerKind } from '@/modules/channel/widget/answerKind.resolver';
import { PostWidgetAudioUseCase } from '@/modules/channel/widget/postWidgetAudio.use-case';
import type { PostWidgetMessageUseCase } from '@/modules/channel/widget/postWidgetMessage.use-case';
import { withAnswerKind } from '@/modules/channel/widget/widget.mapper';
import type { ExtractLeadSignalsUseCase } from '@/modules/conversation/extractLeadSignals.use-case';
import { CONVERSATION_OUTCOME } from '@/modules/conversation/conversation.constant';
import { LEAD_CONTEXT_KEY } from '@/shared/constants/domain.constant';

const AUDIO = { buffer: Buffer.from('opus'), mimeType: 'audio/webm' };

function fakeTranscriber(text: string): AudioTranscriber {
  return { name: 'fake', transcribe: async () => ({ text, engine: 'fake' }) };
}

function failingTranscriber(error: Error): AudioTranscriber {
  return {
    name: 'fake',
    transcribe: async () => {
      throw error;
    },
  };
}

function fakePostMessage(sent: string[]): PostWidgetMessageUseCase {
  return {
    execute: async ({ text }: { text: string }) => {
      sent.push(text);
      return { outcome: CONVERSATION_OUTCOME.PRESENTED };
    },
  } as unknown as PostWidgetMessageUseCase;
}

function fakeExtractor(seen: string[]): ExtractLeadSignalsUseCase {
  return {
    execute: async ({ text }: { text: string }) => {
      seen.push(text);
    },
  } as unknown as ExtractLeadSignalsUseCase;
}

describe('PostWidgetAudioUseCase', () => {
  test('o texto transcrito entra na conversa como fala do visitante', async () => {
    const sent: string[] = [];
    const extracted: string[] = [];
    const useCase = new PostWidgetAudioUseCase({
      transcriber: fakeTranscriber('  quero saber de dashboards  '),
      postMessage: fakePostMessage(sent),
      extractLeadSignals: fakeExtractor(extracted),
    });

    const result = await useCase.execute({ sessionId: 'w0011223344556677', audio: AUDIO });

    expect(result.outcome).toBe(CONVERSATION_OUTCOME.PRESENTED);
    expect(sent).toEqual(['quero saber de dashboards']);
    expect(extracted).toEqual(['quero saber de dashboards']);
  });

  test('audio em silencio nao vira mensagem vazia na conversa', async () => {
    const sent: string[] = [];
    const useCase = new PostWidgetAudioUseCase({
      transcriber: fakeTranscriber('   '),
      postMessage: fakePostMessage(sent),
      extractLeadSignals: fakeExtractor([]),
    });

    await expect(useCase.execute({ sessionId: 'w0011223344556677', audio: AUDIO })).rejects.toThrow();
    expect(sent).toHaveLength(0);
  });

  test('cota estourada vira espera com prazo, nao erro interno', async () => {
    const sent: string[] = [];
    const useCase = new PostWidgetAudioUseCase({
      transcriber: failingTranscriber(new TranscriptionRateLimitError('groq', 12)),
      postMessage: fakePostMessage(sent),
      extractLeadSignals: fakeExtractor([]),
    });

    const error = await useCase.execute({ sessionId: 'w0011223344556677', audio: AUDIO }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(WidgetAudioBusyError);
    expect((error as WidgetAudioBusyError).statusCode).toBe(429);
    expect((error as WidgetAudioBusyError).context.retryAfterSeconds).toBe(12);
    expect(sent).toHaveLength(0);
  });

  test('sem prazo do provedor o visitante ainda recebe um numero para esperar', async () => {
    const useCase = new PostWidgetAudioUseCase({
      transcriber: failingTranscriber(new TranscriptionRateLimitError('groq')),
      postMessage: fakePostMessage([]),
      extractLeadSignals: fakeExtractor([]),
    });

    const error = await useCase.execute({ sessionId: 'w0011223344556677', audio: AUDIO }).catch((caught: unknown) => caught);

    expect((error as WidgetAudioBusyError).context.retryAfterSeconds).toBe(AUDIO_DEFAULT_RETRY_AFTER_SECONDS);
  });

  test('falha do engine nao vira 500 generico', async () => {
    const useCase = new PostWidgetAudioUseCase({
      transcriber: failingTranscriber(new TranscriptionError('deu ruim', 'groq', true)),
      postMessage: fakePostMessage([]),
      extractLeadSignals: fakeExtractor([]),
    });

    const error = await useCase.execute({ sessionId: 'w0011223344556677', audio: AUDIO }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(WidgetAudioFailedError);
    expect((error as WidgetAudioFailedError).statusCode).toBe(502);
  });

  test('sem engine configurado a rota recusa em vez de fingir que aceitou', async () => {
    const useCase = new PostWidgetAudioUseCase({
      transcriber: undefined,
      postMessage: fakePostMessage([]),
      extractLeadSignals: fakeExtractor([]),
    });

    await expect(useCase.execute({ sessionId: 'w0011223344556677', audio: AUDIO })).rejects.toThrow();
  });
});

describe('resolveAnswerKind', () => {
  test('a pergunta do nome pede o autocomplete de nome', () => {
    const kind = resolveAnswerKind({
      id: 'pergunta_nome',
      type: 'question',
      questionType: 'text',
      contextKey: LEAD_CONTEXT_KEY.NAME,
    });

    expect(kind).toBe('name');
  });

  test('no de escolha nao pede autocomplete: quem responde clica', () => {
    expect(resolveAnswerKind({ id: 'menu', type: 'menu' })).toBe('');
    expect(resolveAnswerKind({ id: 'p', type: 'question', questionType: 'choice' })).toBe('');
  });

  test('cpf nunca vira sugestao do navegador', () => {
    expect(resolveAnswerKind({ id: 'p', type: 'question', questionType: 'cpf' })).toBe('');
  });
});

describe('withAnswerKind', () => {
  const message = {
    id: '1',
    direction: 'outbound',
    sender: 'bot',
    type: 'text',
    content: 'Como podemos te chamar?',
    payload: null,
    createdAt: new Date().toISOString(),
  };

  test('o hint entra apenas na ultima mensagem', () => {
    const [first, last] = withAnswerKind([{ ...message, id: '0' }, message], 'name');

    expect(first?.payload).toBeNull();
    expect(last?.payload).toEqual({ answerKind: 'name' });
  });

  test('sem hint o payload fica intacto', () => {
    expect(withAnswerKind([message], '')[0]?.payload).toBeNull();
  });
});
