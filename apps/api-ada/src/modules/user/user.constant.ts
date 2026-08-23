/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/** Prefixo das rotas do modulo. Paralelo a `/v1/auth/*` do `@ada/user-sdk` durante a Fase A. */
export const USER_BASE_PATH = '/v1/panel/user';

/**
 * Escopo interno do `user-module` para `/admin/users`.
 *
 * Ao contrario do catalogo, as rotas admin do modulo declaram `requiredScopes: ['user:admin']` —
 * o despachante so aceita quem o resolver devolver com este escopo, entao o literal precisa bater
 * com o do pacote (acoplamento inevitavel, como casar um caminho de REST).
 */
export const USER_ADMIN_SCOPE = 'user:admin';
