/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { Paperclip, Send, X } from 'lucide-react';
import { useRef, useState } from 'react';

import {
  sendTemplateTest,
  uploadNotificationAttachment,
  type NotificationAttachmentRef,
} from '@/modules/notification/notification.api';
import notificationLocale from '@/modules/notification/notification.locale.json';

type TestState = 'idle' | 'sending' | 'sent' | 'failed';

const FEEDBACK_MS = 6000;

export type SendTestButtonProps = {
  readonly templateKey: string;
};

/**
 * "Enviar teste" no cabecalho do editor.
 *
 * O envio vai para o PROPRIO agente autenticado — a rota nao aceita destinatario, e o botao nao
 * pergunta. O rotulo diz isso ("Enviar teste para mim") porque um botao que so diz "Enviar" numa
 * tela de template sugere disparar para a base inteira, e essa duvida trava a mao de quem opera.
 *
 * O estado volta para `idle` sozinho: aviso que fica na tela para sempre vira parte do layout, e
 * quem envia duas vezes nao consegue distinguir o segundo resultado do primeiro.
 */
export function SendTestButton({ templateKey }: SendTestButtonProps) {
  const [state, setState] = useState<TestState>('idle');
  const [attachment, setAttachment] = useState<NotificationAttachmentRef>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locale = notificationLocale.test;

  /**
   * O upload acontece ao escolher, e nao ao enviar: o arquivo pode levar segundos e falhar por
   * tamanho ou tipo, e descobrir isso junto com o envio confundiria as duas falhas.
   */
  function handleFile(file: File | undefined): void {
    if (!file) return;
    setState('sending');

    uploadNotificationAttachment(file)
      .then((reference) => {
        setAttachment(reference);
        setState('idle');
      })
      .catch(() => {
        setState('failed');
        window.setTimeout(() => setState('idle'), FEEDBACK_MS);
      });
  }

  function handleClick(): void {
    setState('sending');

    sendTemplateTest(templateKey, attachment)
      .then(() => setState('sent'))
      .catch(() => setState('failed'))
      .finally(() => {
        window.setTimeout(() => setState('idle'), FEEDBACK_MS);
      });
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      {/* Aceita so o que a rota aceita: recusar aqui poupa uma ida ao servidor para descobrir o obvio. */}
      <input
        accept="application/pdf,image/png,image/jpeg,text/csv,application/xml,text/xml"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
        ref={fileInputRef}
        type="file"
      />

      <button
        className="flex min-h-9 items-center gap-2 rounded-panel border border-ink-200 px-3 text-sm text-ink-700 hover:border-ink-400"
        onClick={() => fileInputRef.current?.click()}
        type="button"
      >
        <Paperclip aria-hidden="true" className="size-4" />
        {attachment ? attachment.filename : locale.attach}
      </button>

      {attachment && (
        <button
          aria-label={locale.removeAttachment}
          className="flex size-7 items-center justify-center rounded-panel text-ink-500 hover:text-red-700"
          onClick={() => setAttachment(undefined)}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      )}

      <button
        className="flex min-h-9 items-center gap-2 rounded-panel border border-brand-200 px-3 text-sm font-medium text-brand-700 hover:border-brand-400 disabled:opacity-60"
        disabled={state === 'sending'}
        onClick={handleClick}
        type="button"
      >
        <Send aria-hidden="true" className="size-4" />
        {state === 'sending' ? locale.sending : locale.send}
      </button>

      {/* `role="status"` e nao um toast: a resposta pertence ao botao que a pediu, e leitor de tela
          anuncia sem roubar o foco de quem esta editando o texto. */}
      {state === 'sent' && (
        <span className="text-xs text-emerald-700" role="status">
          {locale.sent}
        </span>
      )}
      {state === 'failed' && (
        <span className="text-xs text-red-700" role="status">
          {locale.failed}
        </span>
      )}
    </span>
  );
}
