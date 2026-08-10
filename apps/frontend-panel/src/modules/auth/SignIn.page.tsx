/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { LogIn } from 'lucide-react';

import authLocale from '@/modules/auth/auth.locale.json';
import { useSignIn } from '@/modules/auth/signIn.hook';

const locale = authLocale.signIn;

const FIELD_CLASS =
  'w-full rounded-panel border border-brand-100 bg-white px-4 py-3 text-base text-ink-900 outline-none placeholder:text-ink-500 focus:border-brand-500';
const LABEL_CLASS = 'mb-2 block text-sm font-medium text-ink-900';

export function SignInPage() {
  const { isSubmitting, errorMessage, handleSubmit } = useSignIn();

  return (
    <main className="flex min-h-full items-center justify-center bg-brand-50 p-6">
      <section className="w-full max-w-md rounded-panel bg-white p-8 shadow-lg shadow-brand-900/5">
        <p className="text-sm font-semibold tracking-widest text-brand-500 uppercase">{locale.brand}</p>
        <h1 className="mt-2 text-2xl font-semibold text-brand-900">{locale.title}</h1>
        <p className="mt-2 text-sm text-ink-500">{locale.subtitle}</p>

        <form className="mt-8" onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className={LABEL_CLASS} htmlFor="email">
              {locale.emailLabel}
            </label>
            <input
              autoComplete="username"
              className={FIELD_CLASS}
              id="email"
              name="email"
              placeholder={locale.emailPlaceholder}
              required
              type="email"
            />
          </div>

          <div className="mb-6">
            <label className={LABEL_CLASS} htmlFor="password">
              {locale.passwordLabel}
            </label>
            <input
              autoComplete="current-password"
              className={FIELD_CLASS}
              id="password"
              name="password"
              placeholder={locale.passwordPlaceholder}
              required
              type="password"
            />
          </div>

          {errorMessage ? (
            <p className="mb-4 rounded-panel bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-panel bg-brand-600 px-4 font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            <LogIn aria-hidden="true" className="size-5" />
            {isSubmitting ? locale.submitting : locale.submit}
          </button>
        </form>
      </section>
    </main>
  );
}
