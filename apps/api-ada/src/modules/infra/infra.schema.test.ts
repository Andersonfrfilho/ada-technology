/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import { infraScheduleBodySchema } from '@/modules/infra/infra.schema';

const VALID_BODY = { activeWeekdays: [1, 2, 3], powerOnTime: '08:00', powerOffTime: '20:00', isEnabled: true };

describe('infraScheduleBodySchema', () => {
  it('aceita ate 7 dias da semana', () => {
    expect(infraScheduleBodySchema.safeParse({ ...VALID_BODY, activeWeekdays: [0, 1, 2, 3, 4, 5, 6] }).success).toBe(true);
  });

  it('rejeita lista com mais de 7 dias, mesmo repetidos', () => {
    const result = infraScheduleBodySchema.safeParse({ ...VALID_BODY, activeWeekdays: [1, 1, 1, 1, 1, 1, 1, 1] });

    expect(result.success).toBe(false);
  });
});
