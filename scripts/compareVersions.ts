/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/**
 * Comparador de versao para os pins do scope `@adatechnology`.
 *
 * Semver reduzido ao que o scope publica: `x.y.z` com prerelease pontilhado opcional. Nao ha
 * metadado de build (`+sha`) nem faixa — o pin e sempre exato — entao uma dependencia de semver
 * inteira nao se paga aqui.
 */

function compareIdentifiers(left: string, right: string): number {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  const isNumericPair = Number.isInteger(leftNumber) && Number.isInteger(rightNumber);

  if (isNumericPair) return leftNumber - rightNumber;
  return left < right ? -1 : left > right ? 1 : 0;
}

function comparePrerelease(left: string, right: string): number {
  // Sem prerelease vence: 1.0.0 e posterior a 1.0.0-rc.19.
  if (left === '' || right === '') return (left === '' ? 1 : 0) - (right === '' ? 1 : 0);

  const leftIdentifiers = left.split('.');
  const rightIdentifiers = right.split('.');

  for (let index = 0; index < Math.max(leftIdentifiers.length, rightIdentifiers.length); index += 1) {
    const leftIdentifier = leftIdentifiers[index];
    const rightIdentifier = rightIdentifiers[index];
    if (leftIdentifier === undefined) return -1;
    if (rightIdentifier === undefined) return 1;

    const difference = compareIdentifiers(leftIdentifier, rightIdentifier);
    if (difference !== 0) return difference;
  }

  return 0;
}

export function compareVersions(left: string, right: string): number {
  const [leftCore = '', leftPrerelease = ''] = left.split('-', 2) as [string?, string?];
  const [rightCore = '', rightPrerelease = ''] = right.split('-', 2) as [string?, string?];

  const leftParts = leftCore.split('.');
  const rightParts = rightCore.split('.');

  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const difference = Number(leftParts[index] ?? 0) - Number(rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }

  return comparePrerelease(leftPrerelease, rightPrerelease);
}

/**
 * A maior versao entre todas as dist-tags, nao a de uma tag fixa.
 *
 * As tags do scope nao seguem convencao estavel: em `meta-whatsapp-module` o `rc` esta a frente do
 * `latest`, em `notification-contracts` e o contrario. Seguir `rc` cegamente rebaixaria o segundo.
 */
export function resolveHighestTaggedVersion(distTags: Record<string, string>): string {
  const highest = Object.values(distTags).sort(compareVersions).at(-1);

  if (!highest) throw new Error('Pacote sem nenhuma dist-tag utilizavel');
  return highest;
}
