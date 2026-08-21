/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { SessionStatus as UserSessionStatus, UserProfile, UserSession } from '@ada/user-sdk';

/** Alias de `UserProfile` do `@ada/user-sdk` — mesmo shape, nome do dominio local. */
export type AgentProfile = UserProfile;

/** Alias de `UserSession` do `@ada/user-sdk` — mesmo shape que o JSON de `/v1/auth/*` devolve. */
export type PanelSession = UserSession;

export type SessionStatus = UserSessionStatus;

/** `| undefined` explicito: `exactOptionalPropertyTypes` separa chave ausente de chave zerada, e o
 * logout precisa da segunda forma para apagar o que ja estava la. */
export type SessionState = {
  readonly status: SessionStatus;
  readonly accessToken?: string | undefined;
  readonly agent?: AgentProfile | undefined;
  readonly signIn: (session: PanelSession) => void;
  readonly signOut: () => void;
  readonly markAnonymous: () => void;
};
