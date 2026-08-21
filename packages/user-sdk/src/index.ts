/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export { USER_ROLE, type UserRole } from './contracts/userRole.constant';
export type { UserProfile } from './contracts/userProfile.types';
export type { UserSession, SessionStatus } from './contracts/userSession.types';
export { localCredentialsSchema, type LocalCredentials } from './contracts/localCredentials.schema';
export { USER_ERROR_CODE, type UserErrorCode } from './contracts/userError.constant';
export { AUTH_ROUTE } from './contracts/authRoute.constant';

export { AUTH_PROVIDER_TYPE, type AuthProviderType } from './providers/authProviderType.constant';
export type { AuthProviderInterface, AuthenticateWithProviderParams } from './providers/authProvider.types';
export type { LocalAuthenticatorInterface } from './providers/localAuthenticator.types';
export { createLocalAuthProvider } from './providers/createLocalAuthProvider';
export {
  resolveAttributeMapping,
  type AttributeMapping,
  type AttributeMappingRule,
} from './providers/attributeMapping.types';

export {
  authProviderConfigSchema,
  authProvidersConfigSchema,
  buildLocalOnlyAuthProvidersConfig,
  type AuthProviderConfig,
  type AuthProvidersConfig,
} from './config/authProvidersConfig.schema';
