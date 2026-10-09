/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { useInfraCosts } from '@/modules/infra/infra.hook';
import infraLocale from '@/modules/infra/infra.locale.json';
import { resolveInfraErrorMessage } from '@/modules/infra/infraError.util';

const locale = infraLocale.costs;

export function InfraCostsPage() {
  const { isPending, isError, error } = useInfraCosts();

  return (
    <section className="h-full min-h-0 overflow-y-auto p-4 desktop:p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{locale.title}</h2>
      {isPending ? <p className="mt-4 text-sm text-gray-500">{locale.loading}</p> : null}
      {isError ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {locale.loadFailed} {resolveInfraErrorMessage(error)}
        </p>
      ) : null}
    </section>
  );
}
