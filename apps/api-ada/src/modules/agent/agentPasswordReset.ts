/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { redis } from '@/infra/cache/redisClient';
import { AGENT_RESET_TOKEN_BYTES, AGENT_RESET_TOKEN_TTL_SECONDS } from '@/modules/agent/agent.constant';

const KEY_PREFIX = 'panel:reset:';

/**
 * Token de redefinicao no Redis, e nao numa tabela.
 *
 * O TTL e a expiracao — nao ha varredura para escrever, nem linha vencida acumulando. O `GETDEL`
 * da o uso unico num comando so, do mesmo jeito que o refresh do painel ja faz. Um `FLUSHALL`
 * derrubaria pedidos em aberto, e o custo disso e a pessoa pedir de novo.
 *
 * O que vai para o Redis e o **digest** do token, nunca ele proprio: quem le um dump do Redis nao
 * consegue redefinir a senha de ninguem. E a mesma razao de a tabela do `user-module` guardar
 * `tokenHash`.
 */
export type IssuedResetToken = {
  readonly token: string
  readonly expiresInSeconds: number
}

export async function issueAgentResetToken(agentId: string): Promise<IssuedResetToken> {
  const token = randomBytes(AGENT_RESET_TOKEN_BYTES).toString('base64url');
  await redis.set(keyOf(token), agentId, 'EX', AGENT_RESET_TOKEN_TTL_SECONDS);

  return { token, expiresInSeconds: AGENT_RESET_TOKEN_TTL_SECONDS };
}

/** Consome o token: devolve o agente uma unica vez, e o segundo uso nao encontra nada. */
export async function consumeAgentResetToken(token: string): Promise<string | undefined> {
  if (!isPlausibleToken(token)) return undefined;

  return (await redis.getdel(keyOf(token))) ?? undefined;
}

/**
 * Recusa antes de ir ao Redis o que nao tem forma de token.
 *
 * Nao e seguranca — a chave nao existiria de qualquer jeito. E para um campo colado errado, ou um
 * varredor de rota, nao virar uma ida ao Redis por tentativa.
 */
function isPlausibleToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{16,128}$/.test(token);
}

/**
 * A chave e o digest, e o digest tem tamanho fixo — que e o que permite comparar em tempo
 * constante mais adiante, se um dia a busca deixar de ser por chave exata.
 */
function keyOf(token: string): string {
  return `${KEY_PREFIX}${createHash('sha256').update(token).digest('hex')}`;
}

/** Exportado so para o teste provar que o digest, e nao o token, e o que vira chave. */
export function resetKeyOf(token: string): string {
  return keyOf(token);
}

/** Comparacao em tempo constante sobre digests de tamanho fixo (`security.md` §2). */
export function equalsSecret(left: string, right: string): boolean {
  const leftDigest = createHash('sha256').update(left).digest();
  const rightDigest = createHash('sha256').update(right).digest();

  return timingSafeEqual(leftDigest, rightDigest);
}
