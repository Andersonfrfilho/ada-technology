/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { QueryClientProvider } from '@tanstack/react-query';

import authLocale from '@/modules/auth/auth.locale.json';
import { SignInPage } from '@/modules/auth/SignIn.page';
import { ResetPasswordPage } from '@/modules/auth/ResetPassword.page';
import { RESET_PASSWORD_PATH } from '@/modules/auth/resetPassword.constant';
import { PREVIEW_PATH } from '@/modules/preview/preview.constant';
import { PreviewPage } from '@/modules/preview/Preview.page';
import { PanelShell } from '@/modules/shared/components/PanelShell.component';
import { queryClient } from '@/modules/shared/query/queryClient';
import { useRestoredSession } from '@/modules/shared/session/restoreSession.hook';

/**
 * Lido uma vez, fora do componente: o caminho so muda com recarga, e a constante mantem a ordem dos
 * hooks estavel entre renders. `import.meta.env.DEV` e o que garante que a tela de dado falso
 * desapareca do bundle de producao — o Vite remove o ramo inteiro.
 */
const IS_PREVIEW_ROUTE = import.meta.env.DEV && window.location.pathname === PREVIEW_PATH;

/** Publica em todo ambiente: e o destino do link do e-mail, e quem chega nela nao tem sessao. */
const IS_RESET_ROUTE = window.location.pathname === RESET_PASSWORD_PATH;

/**
 * A navegacao entre secoes e por caminho, sem roteador.
 *
 * As telas do pacote guardam o proprio estado na query string com `history.replaceState`; um
 * roteador com localizacao propria brigaria com essas escritas. O shell manda no caminho, cada
 * workspace manda nos seus parametros.
 */
export function App() {
  if (IS_PREVIEW_ROUTE) return <PreviewPage />;

  /*
    Antes de restaurar sessao: quem vem do link de redefinicao costuma ter um refresh velho no
    cookie, e restaurar primeiro jogaria a pessoa direto no painel — sem nunca mostrar o formulario
    que ela veio preencher.
  */
  if (IS_RESET_ROUTE) return <ResetPasswordPage />;

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const status = useRestoredSession();

  if (status === 'unknown') {
    return (
      <main className="flex min-h-full items-center justify-center bg-brand-50">
        <p className="text-sm text-ink-500">{authLocale.session.restoring}</p>
      </main>
    );
  }

  if (status !== 'authenticated') return <SignInPage />;

  return (
    <QueryClientProvider client={queryClient}>
      <PanelShell />
    </QueryClientProvider>
  );
}
