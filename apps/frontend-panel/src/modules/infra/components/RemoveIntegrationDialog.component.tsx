/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

import { IntegrationNotice } from '@/modules/infra/components/IntegrationNotice.component';
import { IntegrationPasswordField } from '@/modules/infra/components/IntegrationPasswordField.component';
import infraLocale from '@/modules/infra/infra.locale.json';
import { RAILWAY_TOKENS_LABEL, RAILWAY_TOKENS_URL } from '@/modules/infra/infraIntegration.constant';
import { useRemoveInfraIntegration, useResetMutationOnUnmount } from '@/modules/infra/infraIntegration.hook';
import { isInformationalIntegrationError, resolveIntegrationErrorMessage } from '@/modules/infra/infraIntegration.util';
import { INFRA_BUTTON_DANGER, INFRA_BUTTON_SECONDARY } from '@/modules/infra/infraStyle.constant';

type RemoveIntegrationDialogProps = {
  readonly onClose: () => void;
  readonly onRemoved: () => void;
};

type RemoveFailure = { readonly message: string; readonly isInformational: boolean };

const locale = infraLocale.integration.remove;

/** Montado so enquanto aberto: fechar descarta a senha digitada. */
export function RemoveIntegrationDialog({ onClose, onRemoved }: RemoveIntegrationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const { mutate, reset, isPending } = useRemoveInfraIntegration();
  const [password, setPassword] = useState('');
  const [failure, setFailure] = useState<RemoveFailure | undefined>(undefined);
  useResetMutationOnUnmount(reset);

  const canConfirm = password.length > 0 && !isPending;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  /** `close()` nativo devolve o foco ao botao que abriu o dialogo; desmontar direto o perderia. */
  function requestClose() {
    dialogRef.current?.close();
  }

  function handleConfirm() {
    if (!canConfirm) return;

    setFailure(undefined);
    mutate(
      { password },
      {
        onSuccess: () => {
          setPassword('');
          reset();
          onRemoved();
          requestClose();
        },
        onError: (error) => {
          setFailure({
            message: resolveIntegrationErrorMessage(error),
            isInformational: isInformationalIntegrationError(error),
          });
          setPassword('');
          reset();
        },
      },
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    if (!(event.target instanceof HTMLInputElement)) return;

    event.preventDefault();
    handleConfirm();
  }

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-panel border border-gray-200 bg-white p-0 text-ink-900 backdrop:bg-black/50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="space-y-4 p-5" onKeyDown={handleKeyDown}>
        <header className="space-y-1">
          <h2 className="text-base font-semibold" id={titleId}>
            {locale.title}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300" id={descriptionId}>
            {locale.description}{' '}
            <a
              className="font-medium underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              href={RAILWAY_TOKENS_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              {RAILWAY_TOKENS_LABEL}
            </a>
            {locale.descriptionSuffix}
          </p>
        </header>

        <IntegrationPasswordField isReadOnly={isPending} onChange={setPassword} value={password} />

        {failure ? <IntegrationNotice isInformational={failure.isInformational} message={failure.message} /> : null}

        <footer className="flex flex-wrap justify-end gap-2">
          <button className={INFRA_BUTTON_SECONDARY} onClick={requestClose} type="button">
            {locale.cancel}
          </button>
          <button className={INFRA_BUTTON_DANGER} disabled={!canConfirm} onClick={handleConfirm} type="button">
            {isPending ? locale.confirming : locale.confirm}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
