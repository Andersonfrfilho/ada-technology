/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { useState } from 'react';

import { CircleCheck, RefreshCw } from 'lucide-react';

import { InfraPageHeader } from '@/modules/infra/components/InfraPageHeader.component';
import { IntegrationForm } from '@/modules/infra/components/IntegrationForm.component';
import { IntegrationNotice } from '@/modules/infra/components/IntegrationNotice.component';
import { IntegrationNotices } from '@/modules/infra/components/IntegrationNotices.component';
import { IntegrationStatus } from '@/modules/infra/components/IntegrationStatus.component';
import { RemoveIntegrationSection } from '@/modules/infra/components/RemoveIntegrationSection.component';
import infraLocale from '@/modules/infra/infra.locale.json';
import { INFRA_INTEGRATION_SOURCE } from '@/modules/infra/infraIntegration.constant';
import { useInfraIntegration } from '@/modules/infra/infraIntegration.hook';
import { isInformationalIntegrationError, resolveIntegrationErrorMessage } from '@/modules/infra/infraIntegration.util';
import { INFRA_BUTTON_SECONDARY } from '@/modules/infra/infraStyle.constant';

const locale = infraLocale.integration;

export function InfraIntegrationPage() {
  const { data, isPending, isError, error, refetch } = useInfraIntegration();
  const [wasRemoved, setWasRemoved] = useState(false);

  const isPanelSource = data?.source === INFRA_INTEGRATION_SOURCE.PANEL;
  const canEdit = data !== undefined && data.source !== INFRA_INTEGRATION_SOURCE.ENVIRONMENT;
  const showRemovedNotice = wasRemoved && data?.source === INFRA_INTEGRATION_SOURCE.NONE;

  return (
    <section className="h-full min-h-0 overflow-y-auto p-4 desktop:p-6">
      <InfraPageHeader subtitle={locale.subtitle} title={locale.title} />

      <div className="max-w-3xl space-y-4">
        {isPending ? (
          <p className="text-sm text-gray-500 dark:text-gray-400" role="status">
            {locale.loading}
          </p>
        ) : null}

        {isError ? (
          <div className="space-y-3">
            <IntegrationNotice
              isInformational={isInformationalIntegrationError(error)}
              message={`${locale.loadFailed} ${resolveIntegrationErrorMessage(error)}`}
            />
            {isInformationalIntegrationError(error) ? null : (
              <button className={INFRA_BUTTON_SECONDARY} onClick={() => void refetch()} type="button">
                <RefreshCw aria-hidden="true" className="size-4" />
                {locale.retry}
              </button>
            )}
          </div>
        ) : null}

        {showRemovedNotice ? (
          <p
            className="flex items-start gap-2 rounded-panel border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100"
            role="status"
          >
            <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {locale.remove.removed}
          </p>
        ) : null}

        {data ? (
          <>
            <IntegrationNotices view={data} />
            <IntegrationStatus view={data} />
            {canEdit ? <IntegrationForm view={data} /> : null}
            {isPanelSource ? <RemoveIntegrationSection onRemoved={() => setWasRemoved(true)} /> : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
