/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { type FormEvent, useState } from 'react';

import { signInAgent } from '@/modules/auth/auth.api';
import authLocale from '@/modules/auth/auth.locale.json';
import { API_ERROR_CODE } from '@/modules/shared/http/http.constant';
import { PanelApiError } from '@/modules/shared/http/http.error';
import { useSessionStore } from '@/modules/shared/session/session.store';

const EMAIL_FIELD = 'email';
const PASSWORD_FIELD = 'password';

export type UseSignInResult = {
  readonly isSubmitting: boolean;
  readonly errorMessage?: string;
  readonly handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function useSignIn(): UseSignInResult {
  const signIn = useSessionStore((state) => state.signIn);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const email = String(form.get(EMAIL_FIELD) ?? '');
    const password = String(form.get(PASSWORD_FIELD) ?? '');

    setIsSubmitting(true);
    setErrorMessage(undefined);

    signInAgent({ email, password })
      .then(signIn)
      .catch((error: unknown) => setErrorMessage(messageOf(error)))
      .finally(() => setIsSubmitting(false));
  }

  return {
    isSubmitting,
    ...(errorMessage === undefined ? {} : { errorMessage }),
    handleSubmit,
  };
}

/** A tela fala pelo codigo: a `message` da API e texto de servidor, nao copy para o atendente. */
function messageOf(error: unknown): string {
  if (!(error instanceof PanelApiError)) return authLocale.signIn.unexpected;

  if (error.code === API_ERROR_CODE.INVALID_CREDENTIALS) return authLocale.signIn.invalidCredentials;
  if (error.code === API_ERROR_CODE.NETWORK_UNREACHABLE) return authLocale.signIn.networkUnreachable;

  return authLocale.signIn.unexpected;
}
