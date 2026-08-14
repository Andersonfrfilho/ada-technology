/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { z } from 'zod';

import { PANEL_MESSAGE_MAX_LENGTH } from '@/modules/panel/panel.constant';
import { SIMULATION_COMMAND_KIND } from '@/modules/simulation/simulation.constant';

/**
 * Teto do canal mais largo; o mais estreito e reaplicado na entrega.
 *
 * A validacao final e a do proprio canal, para a mensagem simulada ser recusada exatamente onde a
 * mensagem de verdade seria.
 */
export const simulationCommandSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal(SIMULATION_COMMAND_KIND.TEXT),
    text: z.string().trim().min(1).max(PANEL_MESSAGE_MAX_LENGTH),
  }),
  z.object({
    kind: z.literal(SIMULATION_COMMAND_KIND.REPLY),
    option: z.object({
      id: z.string().trim().min(1),
      title: z.string().trim().min(1),
    }),
  }),
]);
