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
/**
 * O telefone atual, ou o contato unico que as conversas antigas gravaram.
 *
 * Ate a separacao entre WhatsApp e e-mail o fluxo perguntava "e-mail ou telefone" e guardava tudo
 * em `leadContact`. Trocar a chave sem o `COALESCE` faria a coluna Contato da tela de Clientes ficar
 * vazia para todo lead ja capturado — o dado continua no jsonb, e continua sendo o que a pessoa deu.
 */
export const LEAD_CONTACT_FIELD = sql<string | null>`coalesce(${sessions.context}->>${LEAD_CONTEXT_KEY.PHONE}, ${sessions.context}->>${LEAD_CONTEXT_KEY.CONTACT})`;
export const LEAD_EMAIL_FIELD = sql<string | null>`${sessions.context}->>${LEAD_CONTEXT_KEY.EMAIL}`;
export const LEAD_INTEREST_FIELD = sql<string | null>`${sessions.context}->>${LEAD_CONTEXT_KEY.INTEREST}`;
