/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { Info, RefreshCw } from 'lucide-react';

import { INFRA_ERROR_CODE } from '@/modules/infra/infra.constant';
import infraLocale from '@/modules/infra/infra.locale.json';
import { resolveInfraErrorMessage } from '@/modules/infra/infraError.util';
import { INFRA_ALERT_ERROR, INFRA_BUTTON_SECONDARY, INFRA_PANEL_CARD } from '@/modules/infra/infraStyle.constant';
import { PanelApiError } from '@/modules/shared/http/http.error';

type InfraQueryErrorProps = {
  readonly error: unknown;
  readonly failureMessage: string;
  readonly retryLabel: string;
  readonly onRetry: () => void;
};

export function InfraQueryError({ error, failureMessage, retryLabel, onRetry }: InfraQueryErrorProps) {
  const isNotConfigured = error instanceof PanelApiError && error.code === INFRA_ERROR_CODE.NOT_CONFIGURED;

  if (isNotConfigured) {
    return (
      <section className={`${INFRA_PANEL_CARD} flex items-start gap-3 p-5`} role="status">
        <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-600 dark:text-brand-400" />
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-ink-900 dark:text-white">{infraLocale.notConfigured.title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">{infraLocale.notConfigured.description}</p>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      <p className={INFRA_ALERT_ERROR} role="alert">
        {failureMessage} {resolveInfraErrorMessage(error)}
      </p>
      <button className={INFRA_BUTTON_SECONDARY} onClick={onRetry} type="button">
        <RefreshCw aria-hidden="true" className="size-4" />
        {retryLabel}
      </button>
    </div>
  );
}
