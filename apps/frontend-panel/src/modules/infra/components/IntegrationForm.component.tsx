/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { useId, useState, type KeyboardEvent } from 'react';

import { CircleCheck } from 'lucide-react';

import { IntegrationNotice } from '@/modules/infra/components/IntegrationNotice.component';
import { IntegrationPasswordField } from '@/modules/infra/components/IntegrationPasswordField.component';
import { SecretTokenField } from '@/modules/infra/components/SecretTokenField.component';
import infraLocale from '@/modules/infra/infra.locale.json';
import { INFRA_INTEGRATION_SOURCE } from '@/modules/infra/infraIntegration.constant';
import { useResetMutationOnUnmount, useSaveInfraIntegration } from '@/modules/infra/infraIntegration.hook';
import {
  canSubmitIntegration,
  isInformationalIntegrationError,
  normalizeToken,
  resolveIntegrationErrorMessage,
  validateTokenFormat,
} from '@/modules/infra/infraIntegration.util';
import { INFRA_BUTTON_PRIMARY, INFRA_HINT, INFRA_PANEL_CARD } from '@/modules/infra/infraStyle.constant';
import type { InfraIntegrationView } from '@/modules/infra/types/infraIntegration.types';

type IntegrationFormProps = {
  readonly view: InfraIntegrationView;
};

type SaveFeedback =
  | { readonly kind: 'success' }
  | { readonly kind: 'error'; readonly message: string; readonly isInformational: boolean };

const locale = infraLocale.integration.form;

/**
 * Sem `<form>` de proposito: um envio de formulario com campo de senha faz o navegador oferecer
 * "salvar senha" — e o que ficaria guardado seria o token ao lado da senha do painel.
 */
export function IntegrationForm({ view }: IntegrationFormProps) {
  const titleId = useId();
  const { mutate, reset, isPending } = useSaveInfraIntegration();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [isTokenVisible, setIsTokenVisible] = useState(false);
  const [feedback, setFeedback] = useState<SaveFeedback | undefined>(undefined);
  useResetMutationOnUnmount(reset);

  const validation = validateTokenFormat(token);
  const tokenIssue = token.length > 0 && !validation.isValid ? locale.tokenIssues[validation.issue] : undefined;
  const canSubmit = canSubmitIntegration({ token, password, isPending });
  const isReplacing = view.source === INFRA_INTEGRATION_SOURCE.PANEL;

  function clearSecrets() {
    setToken('');
    setPassword('');
    setIsTokenVisible(false);
    reset();
  }

  function handleSave() {
    if (!canSubmit) return;

    setFeedback(undefined);
    mutate(
      { token: normalizeToken(token), password },
      {
        onSuccess: () => {
          setFeedback({ kind: 'success' });
          clearSecrets();
        },
        onError: (error) => {
          setFeedback({
            kind: 'error',
            message: resolveIntegrationErrorMessage(error),
            isInformational: isInformationalIntegrationError(error),
          });
          clearSecrets();
        },
      },
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    if (!(event.target instanceof HTMLInputElement)) return;

    event.preventDefault();
    handleSave();
  }

  return (
    <section aria-labelledby={titleId} className={`${INFRA_PANEL_CARD} space-y-4 p-4 desktop:p-5`}>
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-ink-900 dark:text-white" id={titleId}>
          {isReplacing ? locale.titleReplace : locale.titleNew}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">{locale.description}</p>
      </header>

      <dl>
        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{locale.workspaceLabel}</dt>
        <dd className="mt-0.5 break-words text-sm text-ink-900 dark:text-gray-100">
          {view.workspaceId ?? infraLocale.integration.status.workspaceNone}
        </dd>
        <dd className={INFRA_HINT}>{locale.workspaceHint}</dd>
      </dl>

      <div className="space-y-4" onKeyDown={handleKeyDown}>
        <SecretTokenField
          isReadOnly={isPending}
          isVisible={isTokenVisible}
          issueMessage={tokenIssue}
          onChange={setToken}
          onToggleVisibility={() => setIsTokenVisible((current) => !current)}
          value={token}
        />
        <IntegrationPasswordField
          hint={locale.passwordHint}
          isReadOnly={isPending}
          onChange={setPassword}
          value={password}
        />
      </div>

      <SaveFeedbackMessage feedback={feedback} />

      <button className={INFRA_BUTTON_PRIMARY} disabled={!canSubmit} onClick={handleSave} type="button">
        {isPending ? locale.submitting : locale.submit}
      </button>
    </section>
  );
}

type SaveFeedbackMessageProps = { readonly feedback: SaveFeedback | undefined };

function SaveFeedbackMessage({ feedback }: SaveFeedbackMessageProps) {
  if (!feedback) return null;
  if (feedback.kind === 'error') {
    return <IntegrationNotice isInformational={feedback.isInformational} message={feedback.message} />;
  }

  return (
    <p
      className="flex items-start gap-2 rounded-panel border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100"
      role="status"
    >
      <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {locale.saved}
    </p>
  );
}
