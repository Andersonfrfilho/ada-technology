/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { z } from 'zod';

import { loadInfraSecretKey } from '@/modules/infra/infraSecretKey';

type InfraSecretKeyEnvironment = {
  readonly ENV: string;
  readonly PANEL_JWT_SECRET: string;
  readonly INFRA_SECRET_ENCRYPTION_KEY: string;
  readonly RAILWAY_WORKSPACE_ID: string;
  readonly RAILWAY_ENVIRONMENT_ID: string;
};

const KEY_PATH = 'INFRA_SECRET_ENCRYPTION_KEY';

// Nenhuma mensagem aqui cita o valor da chave: o erro de boot vai para log e terminal.
export function validateInfraSecretKeyEnvironment(
  value: InfraSecretKeyEnvironment,
  context: z.RefinementCtx,
): void {
  if (value.INFRA_SECRET_ENCRYPTION_KEY.length === 0) return;

  const addIssue = (path: string, message: string): void => {
    context.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
  };

  try {
    loadInfraSecretKey(value.INFRA_SECRET_ENCRYPTION_KEY);
  } catch {
    addIssue(KEY_PATH, `${KEY_PATH} precisa ser base64 canonico de exatamente 32 bytes`);
  }

  if (value.ENV !== 'production') addIssue(KEY_PATH, `${KEY_PATH} so e aceito com ENV=production`);

  if (value.INFRA_SECRET_ENCRYPTION_KEY === value.PANEL_JWT_SECRET) {
    addIssue(KEY_PATH, `${KEY_PATH} nao pode ser igual a PANEL_JWT_SECRET`);
  }

  for (const key of ['RAILWAY_WORKSPACE_ID', 'RAILWAY_ENVIRONMENT_ID'] as const) {
    if (value[key].length === 0) addIssue(key, `${key} e obrigatorio quando ${KEY_PATH} esta definido`);
  }
}
