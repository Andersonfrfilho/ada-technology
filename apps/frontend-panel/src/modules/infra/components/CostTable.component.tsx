/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { CostSwatch } from '@/modules/infra/components/CostSwatch.component';
import { computeShare, sortEnvironmentsByCost, sortProjectsByCost, sumMeasurementCost } from '@/modules/infra/costChart.util';
import { formatPercent, formatUsd } from '@/modules/infra/costFormat.util';
import infraLocale from '@/modules/infra/infra.locale.json';
import { INFRA_FOCUS_RING, INFRA_PANEL_CARD } from '@/modules/infra/infraStyle.constant';
import { COST_KIND, COST_MEASUREMENT_COLUMNS } from '@/modules/infra/infraUi.constant';
import type { InfraCosts, InfraEnvironmentCost } from '@/modules/infra/types/infra.types';

type CostTableProps = {
  readonly costs: InfraCosts;
};

const locale = infraLocale.costs;
const HEADER_CELL = 'px-3 py-2 text-right font-medium';
const NUMBER_CELL = 'px-3 py-2 text-right tabular-nums';

export function CostTable({ costs }: CostTableProps) {
  const allEnvironments = costs.projects.flatMap((project) => project.environments);

  return (
    <section aria-labelledby="infra-cost-table-title" className="space-y-2">
      <h2 className="text-sm font-semibold text-ink-900 dark:text-white" id="infra-cost-table-title">
        {locale.tableTitle}
      </h2>
      <div
        aria-labelledby="infra-cost-table-title"
        className={`${INFRA_PANEL_CARD} overflow-x-auto ${INFRA_FOCUS_RING}`}
        role="region"
        tabIndex={0}
      >
        <table className="w-full min-w-[40rem] border-collapse text-sm text-ink-900 dark:text-gray-100">
          <caption className="sr-only">{locale.tableCaption}</caption>
          <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <tr>
              <th className="px-3 py-2 text-left font-medium" scope="col">
                {locale.columnProject}
              </th>
              <th className={HEADER_CELL} scope="col">
                {locale.columnCost}
              </th>
              <th className={HEADER_CELL} scope="col">
                {locale.columnShare}
              </th>
              {COST_MEASUREMENT_COLUMNS.map((measurement) => (
                <th className={HEADER_CELL} key={measurement} scope="col">
                  {locale.measurement[measurement]}
                </th>
              ))}
            </tr>
          </thead>
          {sortProjectsByCost(costs.projects).map((project) => (
            <tbody className="border-b border-gray-200 dark:border-gray-700" key={project.projectId}>
              <tr className="bg-gray-50/60 font-semibold dark:bg-gray-800/50">
                <th className="px-3 py-2 text-left" scope="row">
                  {project.projectName}
                </th>
                <MetricCells cost={project.cost} environments={project.environments} total={costs.totalCost} />
              </tr>
              {sortEnvironmentsByCost(project.environments).map((environment) => (
                <tr key={environment.environmentId}>
                  <th className="px-3 py-2 pl-7 text-left font-normal" scope="row">
                    <span className="inline-flex items-center gap-2">
                      <CostSwatch kind={environment.isProduction ? COST_KIND.PRODUCTION : COST_KIND.STAGING} />
                      {environment.environmentName}
                      <span className="text-xs text-gray-600 dark:text-gray-300">
                        {environment.isProduction ? locale.kindProduction : locale.kindStaging}
                      </span>
                    </span>
                  </th>
                  <MetricCells cost={environment.cost} environments={[environment]} total={costs.totalCost} />
                </tr>
              ))}
            </tbody>
          ))}
          <tfoot className="bg-gray-50 font-semibold dark:bg-gray-800">
            <tr>
              <th className="px-3 py-2 text-left" scope="row">
                {locale.columnTotal}
              </th>
              <MetricCells cost={costs.totalCost} environments={allEnvironments} total={costs.totalCost} />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

type MetricCellsProps = {
  readonly cost: number;
  readonly total: number;
  readonly environments: readonly InfraEnvironmentCost[];
};

function MetricCells({ cost, total, environments }: MetricCellsProps) {
  return (
    <>
      <td className={NUMBER_CELL}>{formatUsd(cost)}</td>
      <td className={NUMBER_CELL}>{formatPercent(computeShare({ cost, total }))}</td>
      {COST_MEASUREMENT_COLUMNS.map((measurement) => (
        <td className={NUMBER_CELL} key={measurement}>
          {formatUsd(sumMeasurementCost({ environments, measurement }))}
        </td>
      ))}
    </>
  );
}
