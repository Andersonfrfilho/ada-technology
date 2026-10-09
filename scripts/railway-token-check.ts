/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

// Read-only diagnostic: proves a Railway workspace token can do, over plain HTTP, everything the Infra module needs.
// Usage: RAILWAY_API_TOKEN=... RAILWAY_WORKSPACE_ID=... bun scripts/railway-token-check.ts

export {};

const RAILWAY_GRAPHQL_URL ='https://backboard.railway.com/graphql/v2';
const REQUEST_TIMEOUT_MILLISECONDS = 20_000;
const STAGING_NAME_PATTERN = /staging/;

type GraphqlResponse = {
  readonly data?: unknown;
  readonly errors?: ReadonlyArray<{ readonly message?: string }>;
};

type CheckOutcome = { readonly isPassing: boolean; readonly detail: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readPath(value: unknown, path: readonly string[]): unknown {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
}

function readEdges(value: unknown, path: readonly string[]): unknown[] {
  const edges = readPath(value, [...path, 'edges']);
  if (!Array.isArray(edges)) return [];
  return edges.map((edge) => readPath(edge, ['node']));
}

async function runQuery(token: string, query: string): Promise<GraphqlResponse> {
  const response = await fetch(RAILWAY_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
  });
  const body: unknown = await response.json();
  if (!isRecord(body)) throw new Error(`unexpected response body (HTTP ${response.status})`);
  return body as GraphqlResponse;
}

function describeErrors(response: GraphqlResponse): string | undefined {
  // Railway answers authentication failures with HTTP 200 and the error in the body
  if (!response.errors || response.errors.length === 0) return undefined;
  return response.errors.map((error) => error.message ?? 'unknown error').join('; ');
}

async function checkWorkspace(token: string, workspaceId: string): Promise<CheckOutcome> {
  const response = await runQuery(token, `query { workspace(workspaceId: "${workspaceId}") { id name } }`);
  const errors = describeErrors(response);
  if (errors) return { isPassing: false, detail: errors };
  const foundId = readPath(response.data, ['workspace', 'id']);
  return foundId === workspaceId
    ? { isPassing: true, detail: 'workspace visible' }
    : { isPassing: false, detail: 'workspace not returned for this token' };
}

async function listStagingEnvironmentIds(token: string, workspaceId: string): Promise<CheckOutcome & { readonly stagingIds: string[] }> {
  const query = `query { projects(workspaceId: "${workspaceId}") { edges { node { name environments { edges { node { id name } } } } } } }`;
  const response = await runQuery(token, query);
  const errors = describeErrors(response);
  if (errors) return { isPassing: false, detail: errors, stagingIds: [] };

  const projects = readEdges(response.data, ['projects']);
  const stagingIds: string[] = [];
  for (const project of projects) {
    for (const environment of readEdges(project, ['environments'])) {
      const name = readPath(environment, ['name']);
      const id = readPath(environment, ['id']);
      if (typeof name === 'string' && typeof id === 'string' && STAGING_NAME_PATTERN.test(name)) stagingIds.push(id);
    }
  }
  return { isPassing: projects.length > 0, detail: `${projects.length} projects, ${stagingIds.length} staging environments`, stagingIds };
}

async function checkBilling(token: string, workspaceId: string): Promise<CheckOutcome & { readonly period?: { start: string; end: string } }> {
  const query = `query { workspace(workspaceId: "${workspaceId}") { customer { currentUsage billingPeriod { start end } } } }`;
  const response = await runQuery(token, query);
  const errors = describeErrors(response);
  if (errors) return { isPassing: false, detail: `billing not readable with this token: ${errors}` };

  const start = readPath(response.data, ['workspace', 'customer', 'billingPeriod', 'start']);
  const end = readPath(response.data, ['workspace', 'customer', 'billingPeriod', 'end']);
  const currentUsage = readPath(response.data, ['workspace', 'customer', 'currentUsage']);
  if (typeof start !== 'string' || typeof end !== 'string' || typeof currentUsage !== 'number') {
    return { isPassing: false, detail: 'billing period or currentUsage missing' };
  }
  return { isPassing: true, detail: `cycle ${start.slice(0, 10)} → ${end.slice(0, 10)}, currentUsage US$ ${currentUsage.toFixed(2)}`, period: { start, end } };
}

async function checkUsage(token: string, workspaceId: string, period: { start: string; end: string }): Promise<CheckOutcome> {
  const query = `query { usage(workspaceId: "${workspaceId}", startDate: "${period.start}", endDate: "${period.end}", measurements: [CPU_USAGE, MEMORY_USAGE_GB, NETWORK_TX_GB, DISK_USAGE_GB], groupBy: [PROJECT_ID, ENVIRONMENT_ID]) { measurement value } }`;
  const response = await runQuery(token, query);
  const errors = describeErrors(response);
  if (errors) return { isPassing: false, detail: errors };
  const rows = readPath(response.data, ['usage']);
  return Array.isArray(rows) && rows.length > 0
    ? { isPassing: true, detail: `${rows.length} usage rows` }
    : { isPassing: false, detail: 'usage returned no rows' };
}

async function checkEnvironmentState(token: string, environmentId: string): Promise<CheckOutcome> {
  const query = `query { environment(id: "${environmentId}") { name serviceInstances { edges { node { serviceId source { image } latestDeployment { deploymentStopped instances { status } } } } } } }`;
  const response = await runQuery(token, query);
  const errors = describeErrors(response);
  if (errors) return { isPassing: false, detail: errors };
  const services = readEdges(response.data, ['environment', 'serviceInstances']);
  return { isPassing: services.length > 0, detail: `${services.length} services readable (deploymentStopped, instance status, source.image)` };
}

function printOutcome(label: string, outcome: CheckOutcome): void {
  console.log(`${outcome.isPassing ? 'PASS' : 'FAIL'}  ${label} — ${outcome.detail}`);
}

async function main(): Promise<void> {
  const token = process.env['RAILWAY_API_TOKEN'] ?? '';
  const workspaceId = process.env['RAILWAY_WORKSPACE_ID'] ?? '';
  if (!token || !workspaceId) {
    console.error('Set RAILWAY_API_TOKEN and RAILWAY_WORKSPACE_ID before running.');
    process.exit(1);
  }

  const outcomes: CheckOutcome[] = [];
  const workspace = await checkWorkspace(token, workspaceId);
  printOutcome('workspace', workspace);
  outcomes.push(workspace);

  const environments = await listStagingEnvironmentIds(token, workspaceId);
  printOutcome('projects and environments', environments);
  outcomes.push(environments);

  const billing = await checkBilling(token, workspaceId);
  printOutcome('billing period and currentUsage', billing);
  outcomes.push(billing);

  if (billing.period) {
    const usage = await checkUsage(token, workspaceId, billing.period);
    printOutcome('usage by project and environment', usage);
    outcomes.push(usage);
  }

  const [firstStagingId] = environments.stagingIds;
  if (firstStagingId) {
    const state = await checkEnvironmentState(token, firstStagingId);
    printOutcome('environment service state', state);
    outcomes.push(state);
  }

  console.log('Not verified here: permission to stop/restart a deployment (a write). Confirm it in the T6.3 manual run.');
  process.exit(outcomes.every((outcome) => outcome.isPassing) ? 0 : 1);
}

await main();
