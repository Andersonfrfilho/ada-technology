/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { ActorType, AuditAction, AuditTarget } from '@/modules/audit/audit.constant';

export type RecordAuditLogParams = {
  readonly actorType: ActorType;
  readonly actorId?: string;
  readonly action: AuditAction;
  readonly targetType: AuditTarget;
  /** Sempre UUID — a coluna e `uuid`. Alvo sem UUID (configuracao, template da Meta) vai na metadata. */
  readonly targetId?: string;
  readonly ipAddress?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
};
