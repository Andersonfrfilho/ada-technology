/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { USER_ROLE, type UserRole } from '../contracts/userRole.constant';

/**
 * Uma regra por campo do perfil: ou o valor vem de uma claim do provedor (`from`), ou e fixo
 * (`value`) — util quando o provedor externo nao carrega papel algum e todo mundo que entra por
 * ali vira o mesmo `role` por configuracao.
 */
export type AttributeMappingRule<TClaims> =
  | { readonly from: keyof TClaims }
  | { readonly value: string };

export type AttributeMapping<TClaims> = {
  readonly email: AttributeMappingRule<TClaims>;
  readonly name: AttributeMappingRule<TClaims>;
  readonly role: AttributeMappingRule<TClaims>;
};

function resolveRule<TClaims>(claims: TClaims, rule: AttributeMappingRule<TClaims>): string {
  if ('value' in rule) return rule.value;

  const claimValue = claims[rule.from];
  return typeof claimValue === 'string' ? claimValue : String(claimValue);
}

function toUserRole(value: string): UserRole {
  const knownRoles = Object.values(USER_ROLE) as readonly string[];
  return knownRoles.includes(value) ? (value as UserRole) : USER_ROLE.AGENT;
}

/** Aplica a regra declarativa sobre as claims cruas do provedor e devolve os tres campos do perfil
 * que nao vem do banco local (`id` continua responsabilidade de quem persiste o registro). */
export function resolveAttributeMapping<TClaims>(
  claims: TClaims,
  mapping: AttributeMapping<TClaims>,
): { readonly email: string; readonly name: string; readonly role: UserRole } {
  return {
    email: resolveRule(claims, mapping.email),
    name: resolveRule(claims, mapping.name),
    role: toUserRole(resolveRule(claims, mapping.role)),
  };
}
