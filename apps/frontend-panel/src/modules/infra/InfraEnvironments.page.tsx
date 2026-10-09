/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { AccessBanner } from '@/modules/infra/components/AccessBanner.component';
import { InfraPageHeader } from '@/modules/infra/components/InfraPageHeader.component';
import { InfraQueryError } from '@/modules/infra/components/InfraQueryError.component';
import { ProjectGroup } from '@/modules/infra/components/ProjectGroup.component';
import { useInfraEnvironments } from '@/modules/infra/infra.hook';
import infraLocale from '@/modules/infra/infra.locale.json';

const locale = infraLocale.environments;

export function InfraEnvironmentsPage() {
  const { data, isPending, isError, error, refetch } = useInfraEnvironments();

  return (
    <section className="h-full min-h-0 overflow-y-auto p-4 desktop:p-6">
      <InfraPageHeader subtitle={locale.subtitle} title={locale.title} />

      {isPending ? (
        <p className="text-sm text-gray-500 dark:text-gray-400" role="status">
          {locale.loading}
        </p>
      ) : null}

      {isError ? (
        <InfraQueryError
          error={error}
          failureMessage={locale.loadFailed}
          onRetry={() => void refetch()}
          retryLabel={locale.retry}
        />
      ) : null}

      {data ? (
        <>
          <AccessBanner access={data.access} />
          {data.projects.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale.empty}</p>
          ) : (
            <div className="space-y-6">
              {data.projects.map((project) => (
                <ProjectGroup key={project.projectId} project={project} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
