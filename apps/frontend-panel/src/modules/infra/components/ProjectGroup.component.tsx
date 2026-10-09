/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { useId } from 'react';

import { EnvironmentCard } from '@/modules/infra/components/EnvironmentCard.component';
import infraLocale from '@/modules/infra/infra.locale.json';
import type { InfraProject } from '@/modules/infra/types/infra.types';

type ProjectGroupProps = {
  readonly project: InfraProject;
};

export function ProjectGroup({ project }: ProjectGroupProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h2 className="text-sm font-semibold text-ink-900 dark:text-white" id={headingId}>
        {project.projectName}
        <span className="ml-2 font-normal text-gray-600 tabular-nums dark:text-gray-300">
          {project.environments.length} {infraLocale.environments.environmentsCount}
        </span>
      </h2>
      <div className="grid gap-3 desktop:grid-cols-2">
        {project.environments.map((environment) => (
          <EnvironmentCard environment={environment} key={environment.environmentId} />
        ))}
      </div>
    </section>
  );
}
