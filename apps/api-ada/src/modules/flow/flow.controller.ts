/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { FlowGraphData } from '@adatechnology/meta-whatsapp-contracts';

import { environment } from '@/infra/config/environment';
import { createFlowGraph, deleteFlowGraph, flowGraphs, saveFlowGraph } from '@/infra/container';
import { RATE_LIMIT } from '@/infra/http/rateLimit.constant';
import { readJsonBody } from '@/infra/http/requestBody';
import { jsonData, noContent } from '@/infra/http/responses';
import { AUTH_REQUIREMENT, HTTP_METHOD, requireAgent, type Route } from '@/infra/http/router';
import { FlowKeyMismatchError, FlowNotFoundError } from '@/modules/flow/flow.error';
import { createFlowSchema, flowKeySchema, parseFlowGraph } from '@/modules/flow/flow.schema';

const FLOWS_PATH = '/v1/panel/flows';
const FLOW_PATH = '/v1/panel/flows/:flowKey';

const CREATED = 201;

const companyId = environment.ADA_COMPANY_ID;

/**
 * O editor do pacote carrega todos os grafos de uma vez, indexados por chave.
 *
 * Ele nao pagina nem carrega sob demanda: um salto `flow:` pode apontar para qualquer outro fluxo, e
 * sem o conjunto inteiro em maos a tela nao consegue desenhar a ligacao entre eles.
 */
const listRoute: Route = {
  method: HTTP_METHOD.GET,
  path: FLOWS_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_READ,
  handler: async () => {
    const summaries = await flowGraphs.list.execute({ companyId });

    const graphs = await Promise.all(
      summaries.map((summary) => flowGraphs.get.execute({ companyId, key: summary.key })),
    );

    const byKey = Object.fromEntries(
      graphs.filter((graph): graph is FlowGraphData => graph !== undefined).map((graph) => [graph.key, graph]),
    );

    return jsonData(byKey);
  },
};

const readRoute: Route = {
  method: HTTP_METHOD.GET,
  path: FLOW_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_READ,
  handler: async ({ params }) => {
    const key = flowKeySchema.parse(params.flowKey);
    const graph = await flowGraphs.get.execute({ companyId, key });

    if (!graph) throw new FlowNotFoundError(key);

    return jsonData(graph);
  },
};

const createRoute: Route = {
  method: HTTP_METHOD.POST,
  path: FLOWS_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async (context) => {
    const input = createFlowSchema.parse(await readJsonBody(context.request));
    const { agentId } = requireAgent(context);

    const created = await createFlowGraph.execute({
      companyId,
      key: input.key,
      label: input.label,
      showInMenu: input.showInMenu,
      ...(input.menuOptionLabel ? { menuOptionLabel: input.menuOptionLabel } : {}),
      agentId,
      ipAddress: context.clientAddress,
    });

    return jsonData(created, CREATED);
  },
};

/**
 * A chave viaja duas vezes, no endereco e no corpo, e as duas precisam bater.
 *
 * O corpo e o grafo inteiro que o editor tem em maos; aceitar divergencia seria gravar o desenho de
 * um fluxo por cima de outro, e o unico sinal disso seria o cliente recebendo a pergunta errada.
 */
const saveRoute: Route = {
  method: HTTP_METHOD.PUT,
  path: FLOW_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async (context) => {
    const key = flowKeySchema.parse(context.params.flowKey);
    const graph = parseFlowGraph(await readJsonBody(context.request));

    if (graph.key !== key) throw new FlowKeyMismatchError({ pathKey: key, bodyKey: graph.key });

    const { agentId } = requireAgent(context);

    const saved = await saveFlowGraph.execute({
      companyId,
      graph,
      agentId,
      ipAddress: context.clientAddress,
    });

    return jsonData(saved);
  },
};

const deleteRoute: Route = {
  method: HTTP_METHOD.DELETE,
  path: FLOW_PATH,
  auth: AUTH_REQUIREMENT.AGENT,
  rateLimit: RATE_LIMIT.PANEL_WRITE,
  handler: async (context) => {
    const key = flowKeySchema.parse(context.params.flowKey);
    const { agentId } = requireAgent(context);

    await deleteFlowGraph.execute({
      companyId,
      key,
      agentId,
      ipAddress: context.clientAddress,
    });

    return noContent();
  },
};

export const panelFlowRoutes: readonly Route[] = [
  listRoute,
  readRoute,
  createRoute,
  saveRoute,
  deleteRoute,
];
