/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { useState } from 'react';

import { ResetPasswordForm } from '@adatechnology/user-ui';

import authLocale from '@/modules/auth/auth.locale.json';
import { confirmPasswordReset } from '@/modules/auth/resetPassword.api';
import { AGENT_RESET_TOKEN_INVALID, RESET_TOKEN_QUERY_KEY } from '@/modules/auth/resetPassword.constant';
import { PanelApiError } from '@/modules/shared/http/http.error';

/**
 * Tela publica da redefinicao de senha, alcancada pelo link do e-mail.
 *
 * O formulario vem do `@adatechnology/user-ui`; o que este arquivo faz e ler o token da URL e
 * apontar o submit para a rota de `agents`, que e quem entra neste painel.
 */
export function ResetPasswordPage() {
  const token = new URLSearchParams(window.location.search).get(RESET_TOKEN_QUERY_KEY) ?? '';
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  /*
    Link sem token nao mostra formulario.

    Deixar a pessoa escolher uma senha para so entao dizer que o link esta quebrado gasta o tempo
    dela duas vezes — e ela ainda teria de pedir um link novo do zero.
  */
  if (!token) {
    return <Frame message={authLocale.reset.missingToken} />;
  }

  if (done) {
    return (
      <Frame message={authLocale.reset.done}>
        <a className="text-sm font-semibold text-brand-700 underline" href="/">
          {authLocale.reset.backToSignIn}
        </a>
      </Frame>
    );
  }

  async function handleSubmit(password: string): Promise<void> {
    setSaving(true);
    setError(undefined);

    try {
      await confirmPasswordReset({ token, password });
      setDone(true);
    } catch (cause) {
      // O codigo, e nao a `message` da API: a frase do servidor nao esta traduzida para quem le.
      const code = cause instanceof PanelApiError ? cause.code : undefined;
      setError(code === AGENT_RESET_TOKEN_INVALID ? authLocale.reset.invalidToken : authLocale.reset.failed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Frame message={authLocale.reset.title}>
      <ResetPasswordForm
        loading={saving}
        onSubmit={handleSubmit}
        {...(error ? { error } : {})}
        labels={{ newPassword: authLocale.reset.newPassword, resetPasswordSubmit: authLocale.reset.submit }}
      />
    </Frame>
  );
}

type FrameProps = {
  readonly message: string;
  readonly children?: React.ReactNode;
};

function Frame({ message, children }: FrameProps) {
  return (
    <main className="flex min-h-full items-center justify-center bg-brand-50 p-4">
      <section className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 shadow-sm">
        <p className="text-sm text-ink-700">{message}</p>
        {children}
      </section>
    </main>
  );
}
