/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { TriangleAlert } from 'lucide-react';

import { CostTile } from '@/modules/infra/components/CostTile.component';
import { computeStagingShare } from '@/modules/infra/costChart.util';
import { formatCycleRange, formatPercent, formatPercentPoints, formatUsd } from '@/modules/infra/costFormat.util';
import infraLocale from '@/modules/infra/infra.locale.json';
import type { InfraCosts } from '@/modules/infra/types/infra.types';
import { fillTemplate } from '@/modules/infra/zonedTime.util';

type CostSummaryProps = {
  readonly costs: InfraCosts;
};

const locale = infraLocale.costs;

export function CostSummary({ costs }: CostSummaryProps) {
  const stagingShare = computeStagingShare({ projects: costs.projects });
  const hasOfficialTotal = costs.officialTotal !== undefined;

  return (
    <section className="space-y-3">
      <dl className="grid grid-cols-1 gap-3 tablet:grid-cols-2 desktop:grid-cols-4">
        <CostTile label={locale.total} value={formatUsd(costs.totalCost)} />
        <CostTile
          label={locale.projection}
          note={`${locale.projectionMethod}. ${locale.projectionExplanation}`}
          value={formatUsd(costs.projectedTotal)}
        />
        <CostTile
          isWarning={costs.isDivergent}
          label={locale.officialTotal}
          note={costs.isDivergent ? <DivergenceNote divergencePercent={costs.divergencePercent} /> : undefined}
          value={hasOfficialTotal ? formatUsd(costs.officialTotal ?? 0) : locale.officialTotalMissing}
        />
        <CostTile
          label={locale.period}
          value={formatCycleRange({ periodStart: costs.periodStart, periodEnd: costs.periodEnd })}
        />
      </dl>

      <p className="rounded-panel bg-brand-50 px-4 py-3 text-sm font-medium text-brand-900 dark:bg-brand-900 dark:text-brand-50">
        {stagingShare === undefined
          ? locale.stagingShareUnavailable
          : fillTemplate({ template: locale.stagingShare, values: { percent: formatPercent(stagingShare) } })}
      </p>
    </section>
  );
}

type DivergenceNoteProps = { readonly divergencePercent: number | undefined };

function DivergenceNote({ divergencePercent }: DivergenceNoteProps) {
  const percent = divergencePercent === undefined ? '' : formatPercentPoints(Math.abs(divergencePercent));

  return (
    <span className="flex items-start gap-1.5 font-medium text-amber-900 dark:text-amber-100">
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      {fillTemplate({ template: locale.divergenceWarning, values: { percent } })}
    </span>
  );
}
