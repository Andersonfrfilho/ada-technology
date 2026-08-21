/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { UserProfile } from './userProfile.types';

/** `agent` e nao `user`: e o nome de campo ja publicado no envelope JSON de `/v1/auth/*`; renomear
 * aqui obrigaria a renomear em cascata o `session.store.ts` e todo componente do painel que le
 * `session.agent`, sem nenhum ganho para quem consome o contrato. */
export type UserSession = {
  readonly accessToken: string;
  readonly expiresInSeconds: number;
  readonly agent: UserProfile;
};

export type SessionStatus = 'unknown' | 'anonymous' | 'authenticated';
