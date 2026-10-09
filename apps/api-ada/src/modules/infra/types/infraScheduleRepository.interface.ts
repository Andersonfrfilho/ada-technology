/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type {
  InfraScheduleRecord,
  RecordScheduleEvaluationParams,
  SetKeepOnUntilParams,
  UpsertInfraScheduleParams,
} from '@/modules/infra/types/infraSchedule.types';

export interface InfraScheduleRepositoryInterface {
  findByEnvironmentId(environmentId: string): Promise<InfraScheduleRecord | undefined>;
  listAll(): Promise<readonly InfraScheduleRecord[]>;
  /** Grava so a janela e `isEnabled`; `keepOnUntil` e o estado de avaliacao da agenda existente ficam intactos. */
  upsert(params: UpsertInfraScheduleParams): Promise<InfraScheduleRecord>;
  /** Atualiza so os campos informados; `keepOnUntil: null` limpa. */
  recordEvaluation(params: RecordScheduleEvaluationParams): Promise<void>;
  setKeepOnUntil(params: SetKeepOnUntilParams): Promise<void>;
}
