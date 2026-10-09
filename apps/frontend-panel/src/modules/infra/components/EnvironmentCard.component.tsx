/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { useId } from 'react';

import { ClassificationBadge } from '@/modules/infra/components/ClassificationBadge.component';
import { EnvironmentStateBadge } from '@/modules/infra/components/EnvironmentStateBadge.component';
import { EnvironmentStatusLines } from '@/modules/infra/components/EnvironmentStatusLines.component';
import { PowerActions } from '@/modules/infra/components/PowerActions.component';
import { ScheduleSection } from '@/modules/infra/components/ScheduleSection.component';
import { ServiceList } from '@/modules/infra/components/ServiceList.component';
import { INFRA_ENVIRONMENT_CLASSIFICATION } from '@/modules/infra/infra.constant';
import infraLocale from '@/modules/infra/infra.locale.json';
import { INFRA_PANEL_CARD } from '@/modules/infra/infraStyle.constant';
import type { InfraEnvironment } from '@/modules/infra/types/infra.types';

type EnvironmentCardProps = {
  readonly environment: InfraEnvironment;
};

export function EnvironmentCard({ environment }: EnvironmentCardProps) {
  const headingId = useId();
  const isManaged = environment.classification === INFRA_ENVIRONMENT_CLASSIFICATION.MANAGED;
  const isProtected = environment.classification === INFRA_ENVIRONMENT_CLASSIFICATION.PROTECTED;

  return (
    <article aria-labelledby={headingId} className={`${INFRA_PANEL_CARD} space-y-3 p-4`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="break-all text-base font-semibold text-ink-900 dark:text-white" id={headingId}>
          {environment.environmentName}
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <ClassificationBadge classification={environment.classification} />
          <EnvironmentStateBadge state={environment.state} />
        </div>
      </header>

      <EnvironmentStatusLines environment={environment} />
      <ServiceList services={environment.services} />

      {isProtected ? (
        <p className="text-xs text-gray-600 dark:text-gray-300">{infraLocale.environments.protectedHint}</p>
      ) : null}

      {isManaged ? (
        <>
          <PowerActions environment={environment} />
          <ScheduleSection environment={environment} />
        </>
      ) : null}
    </article>
  );
}
