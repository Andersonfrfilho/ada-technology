/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { z } from 'zod';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

/**
 * O teto do tamanho da senha nao e capricho: sem ele, um corpo de megabytes vira um argon2 sobre
 * megabytes, e uma rota de login sem sessao alguma derruba a API. Compartilhado entre o backend
 * (validacao da rota) e o frontend (validacao do formulario antes do submit).
 */
export const localCredentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});

export type LocalCredentials = z.infer<typeof localCredentialsSchema>;
