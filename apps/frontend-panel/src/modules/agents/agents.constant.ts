/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export const AGENTS_PATH = '/v1/panel/agents';

/** Os dois papeis do painel. `admin` alcanca template, roteamento e este proprio cadastro. */
export const AGENT_ROLES = [
  { value: 'agent', labelKey: 'roleAgent' },
  { value: 'admin', labelKey: 'roleAdmin' },
] as const;

/** O mesmo minimo do schema do servidor — recusar aqui poupa uma ida para descobrir o obvio. */
export const AGENT_PASSWORD_MIN_LENGTH = 12;
