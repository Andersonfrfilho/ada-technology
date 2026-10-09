/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { INFRA_ENVIRONMENT_CLASSIFICATION } from '@/modules/infra/infra.constant';
import type {
  ClassifyEnvironmentParams,
  ClassifyEnvironmentResult,
} from '@/modules/infra/types/railwayInventory.types';

// 'prod' cobre production e abreviações; falhar para o lado seguro é melhor que desligar produção por nome fora do padrão.
const PRODUCTION_MARKER = 'prod';

export function isProductionEnvironmentName(environmentName: string): boolean {
  return environmentName.toLowerCase().includes(PRODUCTION_MARKER);
}

export function classifyEnvironment(params: ClassifyEnvironmentParams): ClassifyEnvironmentResult {
  const { environmentName, environmentId, managedPattern, selfEnvironmentId } = params;

  if (isProductionEnvironmentName(environmentName)) return INFRA_ENVIRONMENT_CLASSIFICATION.PROTECTED;
  // Id vazio nunca casa: sem RAILWAY_ENVIRONMENT_ID não existe proteção por id.
  if (selfEnvironmentId !== '' && selfEnvironmentId === environmentId) {
    return INFRA_ENVIRONMENT_CLASSIFICATION.PROTECTED;
  }
  if (new RegExp(managedPattern, 'i').test(environmentName)) return INFRA_ENVIRONMENT_CLASSIFICATION.MANAGED;
  return INFRA_ENVIRONMENT_CLASSIFICATION.UNMANAGED;
}
