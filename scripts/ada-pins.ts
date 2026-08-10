/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/**
 * Confere (e opcionalmente alinha) os pins dos pacotes `@adatechnology/*`.
 *
 * O SDK e publicado em prerelease sob a dist-tag `rc`, e um pin defasado instala sem erro nenhum:
 * a versao antiga existe, resolve, compila — e simplesmente nao tem os exports novos. O sintoma
 * chega longe da causa (root do React vazio, console limpo). Por isso o pin e exato e conferido
 * por script, nao por faixa de semver.
 */

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { resolveHighestTaggedVersion } from './compareVersions';

const ADA_SCOPE = '@adatechnology/';
const REGISTRY_BASE_URL = 'https://registry.npmjs.org';
const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies'] as const;
const WORKSPACE_DIRECTORIES = ['apps', 'packages'] as const;
const WRITE_FLAG = '--write';
const JSON_INDENT = 2;

type DependencyField = (typeof DEPENDENCY_FIELDS)[number];

type PackageManifest = Record<string, unknown> & Partial<Record<DependencyField, Record<string, string>>>;

type PinCheck = {
  readonly manifestPath: string;
  readonly field: DependencyField;
  readonly packageName: string;
  readonly currentRange: string;
  readonly expectedVersion: string;
  readonly isAligned: boolean;
};

const rootDirectory = join(import.meta.dir, '..');

/** `packages/` ainda nao existe no repositorio; ausencia da pasta nao e erro. */
async function listSubdirectoryNames(absoluteDirectory: string): Promise<readonly string[]> {
  try {
    const entries = await readdir(absoluteDirectory, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

async function findManifestPaths(): Promise<readonly string[]> {
  const paths = [join(rootDirectory, 'package.json')];

  for (const directory of WORKSPACE_DIRECTORIES) {
    const absoluteDirectory = join(rootDirectory, directory);

    for (const name of await listSubdirectoryNames(absoluteDirectory)) {
      const manifestPath = join(absoluteDirectory, name, 'package.json');
      if (await Bun.file(manifestPath).exists()) paths.push(manifestPath);
    }
  }

  return paths;
}

async function fetchDistTags(packageName: string): Promise<Record<string, string>> {
  const encodedName = packageName.replace('/', '%2F');
  const response = await fetch(`${REGISTRY_BASE_URL}/${encodedName}`, {
    // Documento abreviado: o completo carrega todo o historico de versoes e passa de megabytes.
    headers: { accept: 'application/vnd.npm.install-v1+json' },
  });

  if (!response.ok) {
    throw new Error(`Registro respondeu ${response.status} para ${packageName}`);
  }

  const body = (await response.json()) as { 'dist-tags'?: Record<string, string> };
  const distTags = body['dist-tags'];

  if (!distTags) throw new Error(`Pacote ${packageName} sem dist-tags no registro`);
  return distTags;
}

function collectAdaDependencies(manifest: PackageManifest): readonly { field: DependencyField; packageName: string; currentRange: string }[] {
  const collected: { field: DependencyField; packageName: string; currentRange: string }[] = [];

  for (const field of DEPENDENCY_FIELDS) {
    const dependencies = manifest[field];
    if (!dependencies) continue;

    for (const [packageName, currentRange] of Object.entries(dependencies)) {
      if (packageName.startsWith(ADA_SCOPE)) collected.push({ field, packageName, currentRange });
    }
  }

  return collected;
}

async function checkManifest(
  manifestPath: string,
  distTagsCache: Map<string, Record<string, string>>,
): Promise<readonly PinCheck[]> {
  const manifest = (await Bun.file(manifestPath).json()) as PackageManifest;
  const dependencies = collectAdaDependencies(manifest);
  const checks: PinCheck[] = [];

  for (const { field, packageName, currentRange } of dependencies) {
    let distTags = distTagsCache.get(packageName);
    if (!distTags) {
      distTags = await fetchDistTags(packageName);
      distTagsCache.set(packageName, distTags);
    }

    const expectedVersion = resolveHighestTaggedVersion(distTags);
    // Faixa (`^`, `~`) reprova mesmo apontando para a versao certa: amanha ela resolve outra coisa.
    const isAligned = currentRange === expectedVersion;

    checks.push({
      manifestPath: manifestPath.replace(`${rootDirectory}/`, ''),
      field,
      packageName,
      currentRange,
      expectedVersion,
      isAligned,
    });
  }

  return checks;
}

async function writeAlignedManifest(manifestPath: string, checks: readonly PinCheck[]): Promise<void> {
  const manifest = (await Bun.file(manifestPath).json()) as PackageManifest;

  for (const check of checks) {
    const dependencies = manifest[check.field];
    if (dependencies) dependencies[check.packageName] = check.expectedVersion;
  }

  await Bun.write(manifestPath, `${JSON.stringify(manifest, null, JSON_INDENT)}\n`);
}

function reportChecks(checks: readonly PinCheck[]): void {
  for (const check of checks) {
    const status = check.isAligned ? 'ok  ' : 'FORA';
    const detail = check.isAligned
      ? check.currentRange
      : `${check.currentRange} -> ${check.expectedVersion}`;
    console.log(`${status} ${check.packageName.padEnd(42)} ${detail.padEnd(28)} ${check.manifestPath}`);
  }
}

async function main(): Promise<void> {
  const shouldWrite = process.argv.includes(WRITE_FLAG);
  const manifestPaths = await findManifestPaths();
  const distTagsCache = new Map<string, Record<string, string>>();
  const checksByManifest = new Map<string, readonly PinCheck[]>();

  for (const manifestPath of manifestPaths) {
    const checks = await checkManifest(manifestPath, distTagsCache);
    if (checks.length > 0) checksByManifest.set(manifestPath, checks);
  }

  const allChecks = [...checksByManifest.values()].flat();

  if (allChecks.length === 0) {
    console.log('Nenhuma dependencia @adatechnology encontrada.');
    return;
  }

  reportChecks(allChecks);

  const misaligned = allChecks.filter((check) => !check.isAligned);

  if (misaligned.length === 0) {
    console.log(`\n${allChecks.length} pin(s) alinhado(s).`);
    return;
  }

  if (!shouldWrite) {
    console.error(`\n${misaligned.length} pin(s) fora da tag publicada. Rode: make ada-pins-write`);
    process.exit(1);
  }

  for (const [manifestPath, checks] of checksByManifest) {
    if (checks.some((check) => !check.isAligned)) await writeAlignedManifest(manifestPath, checks);
  }

  console.log(`\n${misaligned.length} pin(s) alinhado(s). Reinstalando...`);
  const install = Bun.spawnSync(['bun', 'install'], { cwd: rootDirectory, stdio: ['inherit', 'inherit', 'inherit'] });
  if (install.exitCode !== 0) process.exit(install.exitCode);
}

await main();
