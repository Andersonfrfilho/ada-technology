/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import {
  INFRA_COSTS_CACHE_KEY,
  INFRA_COSTS_CACHE_TTL_SECONDS,
  INFRA_COSTS_DIVERGENCE_THRESHOLD_PERCENT,
  INFRA_COSTS_FALLBACK_CACHE_TTL_SECONDS,
  INFRA_COSTS_LAST_GOOD_CACHE_KEY,
  INFRA_COSTS_LAST_GOOD_TTL_SECONDS,
  INFRA_COSTS_RETRY_DELAY_MILLISECONDS,
  INFRA_COSTS_WINDOW_SOURCE,
} from '@/modules/infra/infra.constant';
import { InfraNotConfiguredError, RailwayRateLimitedError } from '@/modules/infra/infra.error';
import { infraCostsResultSchema } from '@/modules/infra/infraCosts.schema';
import { parseCachedJson } from '@/modules/infra/parseCachedJson';
import { calculateUsageCost } from '@/modules/infra/calculateUsageCost';
import { RAILWAY_PRICING_CHECKED_AT, RAILWAY_PRICING_SOURCE } from '@/modules/infra/railwayPricing.constant';
import type { InfraCacheInterface } from '@/modules/infra/types/infraCache.interface';
import type {
  CostsResult,
  InfraSleep,
  RailwayProject,
  RailwayUsageRow,
  ResolveCostsWindowResult,
} from '@/modules/infra/types/infra.types';
import type { RailwayGatewayInterface } from '@/modules/infra/types/railwayGateway.interface';

type Dependencies = {
  readonly railwayGateway?: RailwayGatewayInterface;
  readonly cache: InfraCacheInterface;
  readonly sleep: InfraSleep;
  readonly now: () => Date;
};

const CURRENCY_DECIMALS = 10_000;
const PERCENT_DECIMALS = 100;

// Arredonda so na apresentacao (4 casas); o calculo e a divergencia usam o numero cheio.
function roundCurrency(value: number): number {
  return Math.round(value * CURRENCY_DECIMALS) / CURRENCY_DECIMALS;
}

function buildCalendarMonthWindow(now: Date): ResolveCostsWindowResult {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - 1);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    windowSource: INFRA_COSTS_WINDOW_SOURCE.CALENDAR_MONTH,
  };
}

/**
 * Custo acumulado do ciclo de cobranca. `endDate` do usage e sempre o FIM do ciclo: o Railway falha com "agora".
 * Projecao linear (acumulado x duracao do ciclo / tempo decorrido); o `estimatedUsage` so cobre CPU e memoria.
 */
export class GetInfraCostsUseCase {
  constructor(private readonly dependencies: Dependencies) {}

  async execute(): Promise<CostsResult> {
    const { railwayGateway, cache } = this.dependencies;
    if (!railwayGateway) throw new InfraNotConfiguredError();

    const cached = await this.readCostsCache(INFRA_COSTS_CACHE_KEY);
    if (cached) return cached;

    const window = await this.resolveWindow(railwayGateway);
    const rows = await this.fetchUsageOrStale({ railwayGateway, window });
    if ('isStale' in rows) return rows;

    const inventory = await railwayGateway.listInventory();
    const result = this.buildResult({ window, rows, inventory });
    await this.storeResult(result);
    return result;
  }

  private async readCostsCache(key: string): Promise<CostsResult | undefined> {
    const raw = await this.dependencies.cache.get(key);
    if (raw === null) return undefined;
    return parseCachedJson({ raw, schema: infraCostsResultSchema }) as CostsResult | undefined;
  }

  // Janela de mes-calendario nasce de falha transitoria do billing: nao vira "ultima copia boa" e expira logo.
  private async storeResult(result: CostsResult): Promise<void> {
    const { cache } = this.dependencies;
    const serialized = JSON.stringify(result);
    if (result.windowSource === INFRA_COSTS_WINDOW_SOURCE.CALENDAR_MONTH) {
      await cache.set(INFRA_COSTS_CACHE_KEY, serialized, INFRA_COSTS_FALLBACK_CACHE_TTL_SECONDS);
      return;
    }
    await cache.set(INFRA_COSTS_CACHE_KEY, serialized, INFRA_COSTS_CACHE_TTL_SECONDS);
    await cache.set(INFRA_COSTS_LAST_GOOD_CACHE_KEY, serialized, INFRA_COSTS_LAST_GOOD_TTL_SECONDS);
  }

  // Sem permissao de cobranca a tela continua: mes-calendario e sem total oficial.
  private async resolveWindow(railwayGateway: RailwayGatewayInterface): Promise<ResolveCostsWindowResult> {
    try {
      const cycle = await railwayGateway.getBillingCycle();
      return {
        start: cycle.start,
        end: cycle.end,
        windowSource: INFRA_COSTS_WINDOW_SOURCE.BILLING_CYCLE,
        officialTotal: cycle.currentUsage,
      };
    } catch {
      return buildCalendarMonthWindow(this.dependencies.now());
    }
  }

  // O usage falha de forma intermitente: uma nova tentativa; depois, a ultima copia boa marcada como antiga.
  private async fetchUsageOrStale(params: {
    readonly railwayGateway: RailwayGatewayInterface;
    readonly window: ResolveCostsWindowResult;
  }): Promise<readonly RailwayUsageRow[] | CostsResult> {
    const { railwayGateway, window } = params;
    const usageParams = { startDate: window.start, endDate: window.end };
    try {
      return await railwayGateway.getUsage(usageParams);
    } catch (error) {
      // Repetir contra um 429 so prolonga o bloqueio, mas a ultima copia boa ainda serve a tela.
      if (error instanceof RailwayRateLimitedError) return this.staleOrThrow(error);
      await this.dependencies.sleep(INFRA_COSTS_RETRY_DELAY_MILLISECONDS);
    }

    try {
      return await railwayGateway.getUsage(usageParams);
    } catch (error) {
      return this.staleOrThrow(error);
    }
  }

  private async staleOrThrow(error: unknown): Promise<CostsResult> {
    const lastGood = await this.readCostsCache(INFRA_COSTS_LAST_GOOD_CACHE_KEY);
    if (lastGood === undefined) throw error;
    return { ...lastGood, isStale: true };
  }

  private buildResult(params: {
    readonly window: ResolveCostsWindowResult;
    readonly rows: readonly RailwayUsageRow[];
    readonly inventory: readonly RailwayProject[];
  }): CostsResult {
    const { window, rows, inventory } = params;
    const projectNames = new Map(inventory.map((project) => [project.id, project.name]));
    const environmentNames = new Map(
      inventory.flatMap((project) => project.environments.map((environment) => [environment.id, environment.name])),
    );
    const calculated = calculateUsageCost({ rows, projectNames, environmentNames });
    const projectionFactor = this.resolveProjectionFactor(window);
    const { officialTotal } = window;
    const divergence =
      officialTotal !== undefined && officialTotal > 0
        ? (Math.abs(calculated.totalCost - officialTotal) / officialTotal) * 100
        : undefined;

    return {
      periodStart: window.start,
      periodEnd: window.end,
      windowSource: window.windowSource,
      currency: 'USD',
      totalCost: roundCurrency(calculated.totalCost),
      ...(officialTotal !== undefined ? { officialTotal } : {}),
      ...(divergence !== undefined
        ? { divergencePercent: Math.round(divergence * PERCENT_DECIMALS) / PERCENT_DECIMALS }
        : {}),
      isDivergent: divergence !== undefined && divergence > INFRA_COSTS_DIVERGENCE_THRESHOLD_PERCENT,
      projectedTotal: roundCurrency(calculated.totalCost * projectionFactor),
      projectionMethod: 'linear',
      projects: calculated.projects.map((project) => ({
        projectId: project.projectId,
        projectName: project.projectName,
        cost: roundCurrency(project.cost),
        projected: roundCurrency(project.cost * projectionFactor),
        environments: project.environments.map((environment) => ({
          ...environment,
          cost: roundCurrency(environment.cost),
          byMeasurement: {
            CPU_USAGE: roundCurrency(environment.byMeasurement.CPU_USAGE),
            MEMORY_USAGE_GB: roundCurrency(environment.byMeasurement.MEMORY_USAGE_GB),
            DISK_USAGE_GB: roundCurrency(environment.byMeasurement.DISK_USAGE_GB),
            NETWORK_TX_GB: roundCurrency(environment.byMeasurement.NETWORK_TX_GB),
          },
        })),
      })),
      pricingCheckedAt: RAILWAY_PRICING_CHECKED_AT,
      pricingSource: RAILWAY_PRICING_SOURCE,
      isStale: false,
    };
  }

  private resolveProjectionFactor(window: ResolveCostsWindowResult): number {
    const start = new Date(window.start).getTime();
    const end = new Date(window.end).getTime();
    const elapsed = this.dependencies.now().getTime() - start;
    if (elapsed <= 0 || elapsed >= end - start) return 1;
    return (end - start) / elapsed;
  }
}
