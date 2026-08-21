/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { z } from 'zod';

import { AUTH_PROVIDER_TYPE } from '../providers/authProviderType.constant';

const baseProviderConfigSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
});

const localProviderConfigSchema = baseProviderConfigSchema.extend({
  type: z.literal(AUTH_PROVIDER_TYPE.LOCAL),
});

const oauth2ProviderConfigSchema = baseProviderConfigSchema.extend({
  type: z.literal(AUTH_PROVIDER_TYPE.OAUTH2),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  authorizationUrl: z.string().url(),
  tokenUrl: z.string().url(),
});

const oidcProviderConfigSchema = baseProviderConfigSchema.extend({
  type: z.literal(AUTH_PROVIDER_TYPE.OIDC),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  issuerUrl: z.string().url(),
});

/** Discriminado por `type`: cada provedor exige so os campos do seu proprio protocolo — o local
 * nao carrega client secret, o OAuth2 nao carrega issuer OIDC. */
export const authProviderConfigSchema = z.discriminatedUnion('type', [
  localProviderConfigSchema,
  oauth2ProviderConfigSchema,
  oidcProviderConfigSchema,
]);

export type AuthProviderConfig = z.infer<typeof authProviderConfigSchema>;

/** Fail-closed no mesmo espirito do `environment.ts`: dois provedores habilitados com o mesmo id
 * colidiriam no mapa de dispatch em tempo de execucao — melhor recusar a config na borda. */
export const authProvidersConfigSchema = z.array(authProviderConfigSchema).superRefine((providers, context) => {
  const enabledIds = providers.filter((provider) => provider.enabled).map((provider) => provider.id);
  const duplicateIds = enabledIds.filter((id, index) => enabledIds.indexOf(id) !== index);

  for (const id of new Set(duplicateIds)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `provider id "${id}" esta habilitado mais de uma vez`,
    });
  }
});

export type AuthProvidersConfig = z.infer<typeof authProvidersConfigSchema>;

const LOCAL_PROVIDER_ID = 'local';

/** O unico provedor de hoje: email/senha, sempre habilitado. Ponto de partida para quando um
 * segundo provedor entrar em `AUTH_PROVIDERS_CONFIG` via env. */
export function buildLocalOnlyAuthProvidersConfig(): AuthProvidersConfig {
  return authProvidersConfigSchema.parse([
    { id: LOCAL_PROVIDER_ID, type: AUTH_PROVIDER_TYPE.LOCAL, enabled: true },
  ]);
}
