/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { buildAvailableSlots } from '@/modules/scheduling/availability';
import { SchedulingDisabledError } from '@/modules/scheduling/scheduling.error';
import type {
  AvailableSlot,
  ListSlotsParams,
  SchedulingRepositoryInterface,
} from '@/modules/scheduling/types/scheduling.types';

const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

/**
 * Os horarios que o cliente pode escolher, ja descontada a ocupacao.
 *
 * A janela buscada e o horizonte inteiro de uma vez: uma consulta por dia multiplicaria round-trip
 * por trinta para devolver a mesma lista.
 */
export class ListAvailableSlotsUseCase {
  constructor(private readonly repository: SchedulingRepositoryInterface) {}

  async execute({ agentIds, now = new Date() }: ListSlotsParams): Promise<readonly AvailableSlot[]> {
    const settings = await this.repository.getSettings();
    if (!settings.isEnabled) throw new SchedulingDisabledError();
    if (agentIds.length === 0) return [];

    const horizonEnd = new Date(now.getTime() + settings.horizonDays * MILLISECONDS_IN_DAY);

    const [rules, busy] = await Promise.all([
      this.repository.listRules(agentIds),
      this.repository.listBusy({ agentIds, from: now, to: horizonEnd }),
    ]);

    return buildAvailableSlots({ agentIds, rules, busy, settings, now });
  }
}
