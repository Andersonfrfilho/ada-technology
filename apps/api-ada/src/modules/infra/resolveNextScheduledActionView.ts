/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { resolveScheduleAction } from '@/modules/infra/resolveScheduleAction';
import type {
  InfraNextScheduledActionView,
  ResolveNextScheduledActionViewParams,
} from '@/modules/infra/types/infra.types';

export function resolveNextScheduledActionView(
  params: ResolveNextScheduledActionViewParams,
): InfraNextScheduledActionView | undefined {
  const { nextScheduledAction } = resolveScheduleAction(params);
  if (!nextScheduledAction) return undefined;
  return { kind: nextScheduledAction.kind, at: nextScheduledAction.at.toISOString() };
}
