/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { sessions } from '@adatechnology/meta-whatsapp-module';
import { sql } from 'drizzle-orm';

import { LEAD_CONTEXT_KEY } from '@/shared/constants/domain.constant';

/**
 * O que o fluxo guardou no contexto da sessao, como coluna.
 *
 * Duas telas leem os mesmos campos do mesmo jsonb — a lista de clientes e a lista de conversas — e
 * duas copias da expressao divergiriam calada no dia em que a chave mudar. O operador `->>` e fixo e
 * a chave vai ligada como parametro; nada aqui e montado por concatenacao.
 */
export const LEAD_NAME_FIELD = sql<string | null>`${sessions.context}->>${LEAD_CONTEXT_KEY.NAME}`;
export const LEAD_CONTACT_FIELD = sql<string | null>`${sessions.context}->>${LEAD_CONTEXT_KEY.CONTACT}`;
export const LEAD_INTEREST_FIELD = sql<string | null>`${sessions.context}->>${LEAD_CONTEXT_KEY.INTEREST}`;
