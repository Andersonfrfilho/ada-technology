/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { INFRA_SCHEDULED_ACTION_KIND } from '@/modules/infra/infra.constant';
import {
  KEEP_ON_MAX_HOURS,
  KEEP_ON_OPTION_ID,
  MILLISECONDS_PER_HOUR,
  type KeepOnOptionId,
} from '@/modules/infra/infraUi.constant';
import type { InfraNextScheduledAction, InfraSchedule } from '@/modules/infra/types/infra.types';
import { getEndOfZonedDay } from '@/modules/infra/zonedTime.util';

export type KeepOnUntilOption = {
  readonly id: KeepOnOptionId;
  /** ISO 8601 em UTC, pronto para ir ao corpo da requisicao. */
  readonly until: string;
};

const RELATIVE_OPTION_HOURS: ReadonlyArray<readonly [KeepOnOptionId, number]> = [
  [KEEP_ON_OPTION_ID.PLUS_ONE_HOUR, 1],
  [KEEP_ON_OPTION_ID.PLUS_TWO_HOURS, 2],
  [KEEP_ON_OPTION_ID.PLUS_FOUR_HOURS, 4],
];

/** O limite de 24 h e da API (RF8b); a tela nunca oferece o que ela recusaria. */
export function buildKeepOnUntilOptions({ now }: { readonly now: Date }): readonly KeepOnUntilOption[] {
  const limit = now.getTime() + KEEP_ON_MAX_HOURS * MILLISECONDS_PER_HOUR;
  const endOfDay = Math.min(getEndOfZonedDay(now).getTime(), limit);

  const relativeOptions = RELATIVE_OPTION_HOURS.map(([id, hours]) => ({
    id,
    until: new Date(Math.min(now.getTime() + hours * MILLISECONDS_PER_HOUR, limit)).toISOString(),
  }));

  return [...relativeOptions, { id: KEEP_ON_OPTION_ID.END_OF_DAY, until: new Date(endOfDay).toISOString() }];
}

/** Ligar fora da janela de uma agenda ativa exige "manter ate": a proxima acao da agenda e ligar. */
export function isKeepOnUntilRequired({
  schedule,
  nextScheduledAction,
}: {
  readonly schedule: InfraSchedule | undefined;
  readonly nextScheduledAction: InfraNextScheduledAction | undefined;
}): boolean {
  if (!schedule?.isEnabled) return false;

  return nextScheduledAction?.kind === INFRA_SCHEDULED_ACTION_KIND.POWER_ON;
}
