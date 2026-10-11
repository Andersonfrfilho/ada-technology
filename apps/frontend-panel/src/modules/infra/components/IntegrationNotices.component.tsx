/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { ExternalLink, Info } from 'lucide-react';

import infraLocale from '@/modules/infra/infra.locale.json';
import { INFRA_INTEGRATION_SOURCE, RAILWAY_TOKENS_LABEL, RAILWAY_TOKENS_URL } from '@/modules/infra/infraIntegration.constant';
import type { InfraIntegrationView } from '@/modules/infra/types/infraIntegration.types';

type IntegrationNoticesProps = {
  readonly view: InfraIntegrationView;
};

const locale = infraLocale.integration.notices;
const NOTICE_CLASSES =
  'flex items-start gap-2 rounded-panel border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100';

/** Avisos que nao somem: o que o painel NAO faz (revogar no Railway) e quem manda quando ha duas fontes. */
export function IntegrationNotices({ view }: IntegrationNoticesProps) {
  const isEnvironmentSource = view.source === INFRA_INTEGRATION_SOURCE.ENVIRONMENT;
  const isPanelSource = view.source === INFRA_INTEGRATION_SOURCE.PANEL;

  return (
    <div className="space-y-2">
      {isPanelSource ? <RevokeWarning /> : null}
      {isEnvironmentSource ? <NoticeLine message={locale.environmentManaged} /> : null}
      {view.environmentTokenAlsoPresent ? <NoticeLine message={locale.environmentAlsoPresent} /> : null}
    </div>
  );
}

type NoticeLineProps = { readonly message: string };

function NoticeLine({ message }: NoticeLineProps) {
  return (
    <p className={NOTICE_CLASSES} role="note">
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

function RevokeWarning() {
  return (
    <p className={NOTICE_CLASSES} role="note">
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>
        {locale.revokePrefix}{' '}
        <a
          className="inline-flex items-center gap-1 font-medium underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          href={RAILWAY_TOKENS_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          {RAILWAY_TOKENS_LABEL}
          <ExternalLink aria-hidden="true" className="size-3.5" />
          <span className="sr-only">{locale.externalLink}</span>
        </a>
        {locale.revokeSuffix}
      </span>
    </p>
  );
}
