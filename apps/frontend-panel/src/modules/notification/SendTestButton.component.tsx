/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { Send } from 'lucide-react';
import { useState } from 'react';

import { sendTemplateTest } from '@/modules/notification/notification.api';
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
  const locale = notificationLocale.test;

  function handleClick(): void {
    setState('sending');

    sendTemplateTest(templateKey)
      .then(() => setState('sent'))
      .catch(() => setState('failed'))
      .finally(() => {
        window.setTimeout(() => setState('idle'), FEEDBACK_MS);
      });
  }

  return (
    <span className="flex items-center gap-2">
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
