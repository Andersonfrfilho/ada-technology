/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { CostChart } from '@/modules/infra/components/CostChart.component';
import { CostFooter } from '@/modules/infra/components/CostFooter.component';
import { CostNotices } from '@/modules/infra/components/CostNotices.component';
import { CostSummary } from '@/modules/infra/components/CostSummary.component';
import { CostTable } from '@/modules/infra/components/CostTable.component';
import { InfraPageHeader } from '@/modules/infra/components/InfraPageHeader.component';
import { InfraQueryError } from '@/modules/infra/components/InfraQueryError.component';
import { useInfraCosts } from '@/modules/infra/infra.hook';
import infraLocale from '@/modules/infra/infra.locale.json';

const locale = infraLocale.costs;

export function InfraCostsPage() {
  const { data, isPending, isError, error, refetch } = useInfraCosts();

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
          <CostNotices costs={data} />
          {data.projects.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale.empty}</p>
          ) : (
            <div className="space-y-6">
              <CostSummary costs={data} />
              <CostChart projects={data.projects} />
              <CostTable costs={data} />
            </div>
          )}
          <CostFooter pricingCheckedAt={data.pricingCheckedAt} pricingSource={data.pricingSource} />
        </>
      ) : null}
    </section>
  );
}
