/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export type AgentProfile = {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: string;
};

export type PanelSession = {
  readonly accessToken: string;
  readonly expiresInSeconds: number;
  readonly agent: AgentProfile;
};

export type SessionStatus = 'unknown' | 'anonymous' | 'authenticated';

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
